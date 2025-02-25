import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import counterDetails from '@salesforce/apex/getSalesDetails.getDetails';
import createOp from '@salesforce/apex/getSalesDetails.createOp';
import getPriceBooks from '@salesforce/apex/omsCPQAPEX.getPriorityPriceBooks';
import eopOp from '@salesforce/apex/getSalesDetails.eopOp';
import {isIn, locIsIn, repIsIn, termPlus, repLocation, allThree} from 'c/utilityHelper';
import LightningPrompt from 'lightning/prompt';
export default class CounterReOrder extends NavigationMixin(LightningElement){
    @api recordId;
    @api totalNumberOfRows;
    loading = true;
    loadAgain = true;
    newId;
    buildingOrder = false; 
    //search variables
    searchTerm ='';
    searching = false; 
    @track copyProducts = []; 
    @track selectedProducts = []; 
    rep =null;
    local=null; 
    showRepFilter;
    showLocationFilter; 
    //scroll height; 
    sHeight 
    canOrder = false; 
    columns = [
        {label:'Order', 'fieldName':'nameURL', type:'url', typeAttributes:{label:{fieldName:'docName'}},target:'_blank' },
        {label:'Product', 'fieldName':'Product_Name__c', type:'text'},
        {label: 'Doc Date', 'fieldName': 'Doc_Date__c', type: 'text'}, 
        {label:'Qty', 'fieldName':'Quantity__c', type:'text'},
        {label:'Unit Price', 'fieldName':'Unit_Price__c', type:'text'},
        {label: '', type: 'button', 
          typeAttributes:{
            label: 'Re-Order', 
            name: 'add prod' ,
            title: 'Reorder',
            disabled: false,
            value: {fieldName: 'rowValue'},
            variant: { fieldName: 'rowVariant' },
        },
        cellAttributes: {
            style: 'transform: scale(0.75)'}
        },
    ];
    @track salesDocs = [];
    
    rowLimit = 25;
    rowOffSet = 0; 
   
    normalPriceBooks = []
    tempHold = new Set();
    //get pricebooks
    @wire(getPriceBooks,{accountId: '$recordId'})
    wiredPriceBooks({error, data}){
        if(data){
            let standardPriceBook = {Pricebook2Id: '01s410000077vSKAAY',Priority:6, PriceBook2:{Name:'Standard'} }
            let order = [...data, standardPriceBook].filter((x)=>x.Priority!=undefined).sort((a,b)=>{
                return a.Priority - b.Priority; 
            })
              console.log(order)
            for(let i = 0; i<order.length; i++){
                this.tempHold.add(order[i].Pricebook2Id)
                //console.log(`Priority ${order[i].Priority} - ${order[i].PriceBook2.Name}`)
                
            }
            this.normalPriceBooks = [...this.tempHold]
            console.log(this.normalPriceBooks, 1)
        }else if(error){
            this.normalPriceBooks = ["01s410000077vSKAAY"];
            console.warn('error loading price books assigned standard price books')
        }
        if(this.normalPriceBooks.length >=1){
            this.loadData();
            this.loading = false; 
            this.startEventListener();

        }
    }

    connectedCallback(){
         

    }

        loadData(){
           return counterDetails({limitSize: this.rowLimit, offset: this.rowOffSet, recordId: this.recordId, pbIds: this.normalPriceBooks})
            .then((res)=>{
                if(res.length>1){
                    let records
                    let nameURL; 
                    let docName;  
                    let rowVariant; 
                    let btnName; 
                    let showCount; 
                    let visAmount;
                    let checkInfo; 
                    let location;
                    let salesRep;
                    records = res.map(row=>{
                        nameURL =  `/${row.Sales_Document__c}`;
                        docName = row.Sales_Document__r.Name;
                        btnName = 'Reorder';
                        rowVariant = 'brand';
                        showCount = false; 
                        visAmount = row.Quantity__c;
                        location = row.Sales_Document__r.Location_Name__c;
                        salesRep = row.Sales_Document__r.Sales_Rep_Name__c;
                        checkInfo = this.checkProdTwo(row); 
                        return{...row, nameURL, docName, rowVariant, btnName, showCount, visAmount,location, salesRep, checkInfo}
                    })
                    console.log(records)
                    let sorted = records.sort((a,b)=> Date.parse(b.Doc_Date__c) - Date.parse(a.Doc_Date__c))
                    let updates = [...this.salesDocs, ...sorted];
                    this.salesDocs = updates;
                    //make a copy for searching the table; 
                    this.copyProducts = updates;  
                    this.sHeight = this.template.querySelector('[data-id="outter"]').scrollHeight;
                    this.loading = false; 
                    this.loadAgain = true;
                    //console.log(JSON.stringify(this.salesDocs)); 
                }else{
                    console.log('all done');
                    this.loading = false;
                    this.loadAgain = false; 
                }

            }).catch(err =>{
                console.log('err', err); 
            })
        }
        checkProdTwo(evt){
            let cost; 
            let margin; 
            if(evt.Product_Std__r){
                cost = evt.Product_Std__r.Agency_Pricing__c ? '': evt.Product_Std__r.Product_Cost__c;
                margin = evt.Product_Std__r.Agency_Pricing__c ? '': evt.Margin__c;
            }else if(evt.Product__r.Agency__c){
                cost = '';
                margin = ''; 
            }else{
                cost = evt.Product__r.Product_Cost__c;
                margin = evt.Margin__c; 
            }
            return {cost, margin}
        }
        loadMoreData(event){
           const currentRecord = this.salesDocs; 
           this.loading = true; 
           this.loadAgain = false; 

           this.rowOffSet = this.rowOffSet + this.rowLimit;
           this.loadData()
        //    .then(()=>{
        //     this.loading = false;
              
        //    }) 
            
        }
        //search
        handleKeyUp(evt) {
            window.clearTimeout(this.delayedTimeout)
            const queryTerm = evt.target.value;  
            this.searching = true; 

            this.delayedTimeout = setTimeout(()=>{
                this.salesDocs = [...this.copyProducts]
                this.searchTerm = queryTerm; 
                this.searchTerm.length >= 3 ? this.handleSearchRes(this.searchTerm)  : this.handleZeroSearch();
                //this.salesDocs = [...this.copyProducts]  
            }, 1000)
        } 
        eventListening = false;
        watchKeyDown = (event) => {
            if(event.key === '`'){
                this.handleSearchRes();
            }
         };
    
        startEventListener(){
            if(!this.eventListening){
                window.addEventListener('keydown', this.watchKeyDown,{
                    once:false,
                }) 
                //this.eventListening = true; 
            }
    
        }
        endEventListener(){
            this.eventListening = false; 
            window.removeEventListener('keydown', this.watchKeyDown);
        }
        handleSearchRes(){
           //all 3 //1 //2 
           if(this.searchTerm && this.rep == null & this.local == null){
                this.handleSearch();
        //term and rep 
           }else if(this.searchTerm && this.rep != null && this.local == null){
                let filtered = termPlus(this.copyProducts, this.searchTerm, this.rep, 'salesRep'); 
                
                this.salesDocs = filtered.length > 0 ? filtered : false; 
                this.scrollUp(); 
                this.searching = false;
        //term and location 
           }else if(this.searchTerm && this.rep == null && this.local != null){
                let filtered = termPlus(this.copyProducts, this.searchTerm, this.local, 'location');  
                
                this.salesDocs = filtered.length > 0 ? filtered : false; 
                this.scrollUp(); 
                this.searching = false;
        //location and rep
           }else if(this.searchTerm.length <3  && this.rep != null && this.local != null){
                let filtered = repLocation(this.copyProducts, this.rep, this.local);  
                
                this.salesDocs = filtered.length > 0 ? filtered : false; 
                this.scrollUp(); 
                this.searching = false;
        //rep only    
           }else if(this.searchTerm.length <3  && this.rep != null && this.local == null){
                let filtered = repIsIn(this.copyProducts, this.rep); 

                this.salesDocs = filtered.length > 0 ? filtered : false; 
                this.scrollUp(); 
                this.searching = false;
        //warehouse only    
           }else if(this.searchTerm.length <3 && this.rep == null && this.local != null){
                let filtered = locIsIn(this.copyProducts, this.local); 

                this.salesDocs = filtered.length > 0 ? filtered : false; 
                this.scrollUp(); 
                this.searching = false; 
                 
        //all 3  
           }else if(this.searchTerm && this.rep != null && this.local != null){
            let filtered = allThree(this.copyProducts, this.searchTerm, this.rep, this.local); 
            
            this.salesDocs = filtered.length > 0 ? filtered : false; 
            this.scrollUp(); 
            this.searching = false;
        //catchall
           }else if(this.searchTerm.length <3 && this.rep == null && this.local == null){
            this.salesDocs = [...this.copyProducts]; 
           }
        }
        handleSearch(term){
            
            let filtered = isIn(this.salesDocs, this.searchTerm); 
            
            this.salesDocs = filtered.length > 0 ? filtered : false; 
            this.scrollUp(); 
            this.searching = false; 
        }

        handleZeroSearch(){
            this.salesDocs = [...this.copyProducts];
            this.searchTerm = '';
            this.searching = false; 
        }
        //This fires on the button being cleared on the input search
        handleClear(event){
            if(!event.target.value.length){
                this.handleZeroSearch(); 
            }
        }

        handleFilterSearch(evt){
            let type = evt.target.name;
            switch(type){
                case 'location':
                    LightningPrompt.open({
                        message: 'Search by Location',
                        //theme defaults to "default"
                        label: 'Search by Location', // this is the header text
                        defaultValue:this.local
                    }).then((result) => {
                        this.local = result
                        this.searching = true; 
                        if(this.local != null && this.local != undefined){
                            this.showLocationFilter = true; 
                            this.handleSearchRes(); 
                        }else{
                            this.local = result
                            this.searching = false;
                            this.showLocationFilter = false; 
                            this.handleSearchRes();
                            return
                        }
                    });
                    break;
                case 'rep':
                    LightningPrompt.open({
                        message: 'Search by Rep',
                        //theme defaults to "default"
                        label: 'Search by Rep', // this is the header text
                        defaultValue:this.rep
                    }).then((result) => {
                        //Prompt has been closed
                        //result is input text if OK clicked
                        //and null if cancel was clicked
                        this.rep = result
                        this.searching = true; 
                        if(this.rep != null && this.rep != undefined){
                            this.showRepFilter = true; 
                            this.handleSearchRes(); 
                        }else{
                            this.rep = result; 
                            this.searching = false;
                            this.showRepFilter = false;
                            this.handleSearchRes();
                            return
                        }
                    });
                    break;
                default:
                    console.log('nothing found...');
            }
        }
        handleFilter(item){
            let toUpdate = item.target.name;
            switch(toUpdate){
                case 'location':
                    this.location = null; 
                    this.showLocationFilter = false;
                    this.handleSearchRes(); 
                    break;
                case 'rep':
                    this.rep = null;
                    this.showRepFilter = false; 
                    this.handleSearchRes()
                    break
                default:
                    console.log('not clearing filters check name value in html');
                    
            }
        }
        scrollUp(){
            
            let containerChoosen = this.template.querySelector('.topTable');
            containerChoosen.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
            
        }
         handleRowClick(e){

            let pc = e.target.name; 
            //find index by ID value of selectable products
            let index = this.salesDocs.findIndex(x => x.Id === pc);
            //See if selected product has been 
            let newProd = this.selectedProducts.findIndex(x => x.code === this.salesDocs[index].Product_Code__c);                  
            let button = this.salesDocs[index].showCount; 
                if(newProd<0){
                    this.selectedProducts = [
                        ...this.selectedProducts, {
                             code: this.salesDocs[index].Product_Code__c,
                             quantity: this.salesDocs[index].Quantity__c
                        }
                    ]
                    //show user prod selected
                    this.canOrder = true; 
                   // this.salesDocs[index].rowVariant = 'success';
                    //this.salesDocs[index].btnName = 'added';
                    this.salesDocs[index].showCount = true;
                    //if they previously selected the product and want to take it out SHOW COUNT SHOULD ACTUALLY BE HANDLED BELOW IN MINUS SECTION
                }else if(newProd >=0 && button){
                    let removeIndex = this.selectedProducts.findIndex(x => x.code === pc);
                    this.selectedProducts.splice(removeIndex, 1);
                    this.selectedProducts.length > 0 ? this.canOrder = true: this.canOrder = false;  
                    this.salesDocs[index].rowVariant = 'brand';
                    this.salesDocs[index].btnName = 'Reorder';  
                }else if(newProd >=0){
                    console.log('already there')
                }

            }

       async handleScroll(evt){
            let btm = evt.target.scrollTop/this.sHeight
            
            if(btm >= .65 && this.loadAgain){
                console.log('in load more'); 
                this.loadMoreData(); 
            }
        
        }
//BUTTONS ON THE TABLE ADD OR SUBTRACT QTY     
        handleAdd(evt){
            let index = this.selectedProducts.findIndex(x=>x.code === evt.target.name);
            let tableIndex = this.salesDocs.findIndex(x => x.Product_Code__c === evt.target.name);
            this.selectedProducts[index].quantity ++; 
            this.salesDocs[tableIndex].visAmount ++;
            console.log('new qty ' , this.selectedProducts[index].quantity);
            
        }
//WHEN THE VALUE IS 0 RESET THE FIELD AND CLOSE THE COUNTER    
        handleMinus(evt){
            let index = this.selectedProducts.findIndex(x=>x.code === evt.target.name);
            let tableIndex = this.salesDocs.findIndex(x => x.Product_Code__c === evt.target.name); 
            if(this.selectedProducts[index].quantity >= 1){
                this.selectedProducts[index].quantity --;
                this.salesDocs[tableIndex].visAmount --;  
                this.salesDocs[tableIndex].visAmount === 0 ? this.closeAdd(evt) : '';
            }// }else if(this.selectedProducts[index].quantity === 0){
            //     this.salesDocs[tableIndex].showCount = false;
            //     this.salesDocs[tableIndex].visAmount = this.salesDocs[tableIndex].Quantity__c
            //     this.selectedProducts.splice(index, 1);
            //     this.selectedProducts.length > 0 ? this.canOrder = true: this.canOrder = false; 
            // }
        }
//CLOSE THE INDIVIDUAL COUNTER
        closeAdd(evt){
            console.log(1, evt)
            let index = this.selectedProducts.findIndex(x=>x.code === evt.target.name);
            let tableIndex = this.salesDocs.findIndex(x => x.Product_Code__c === evt.target.name);
                this.salesDocs[tableIndex].showCount = false;
                this.salesDocs[tableIndex].visAmount = this.salesDocs[tableIndex].Quantity__c
                this.selectedProducts.splice(index, 1);
                this.selectedProducts.length > 0 ? this.canOrder = true: this.canOrder = false;
        }
        makeOrder(){
            this.buildingOrder = true; 
            createOp({accId: this.recordId, prod: this.selectedProducts})
            .then(res=>{
                this.buildingOrder = false; 
                this.newId = res
                this.naviToOpp(this.newId); 
            }).catch(err=>{
                console.log(err);
            })
            
        }

        eopOrder(){
            this.buildingOrder = true; 
            eopOp({accId: this.recordId, prod: this.selectedProducts})
            .then(res=>{
                this.buildingOrder = false; 
                this.newId = res
                this.naviToOpp(this.newId); 
            }).catch(err=>{
                console.log(err);
            })
            
        }

//RESIZE STUFF
        mouseStart;
        oldWidth; 
        calculateWidth(evt){
            var childObj = evt.target
            var parObj = childObj.parentNode;
            var count = 1;
            while(parObj.tagName != 'TH') {
                parObj = parObj.parentNode;
                count++;
            }
            console.log('final tag Name'+parObj.tagName);
            this.mouseStart = evt.clientX;
            this.oldWidth = parObj.offsetWidth; 
        }

        setNewWidth(event){
            var childObj = event.target
            var parObj = childObj.parentNode;
            var count = 1;
            while(parObj.tagName != 'TH') {
                parObj = parObj.parentNode;
                count++;
            }
            var newWidth = event.clientX- parseFloat(this.mouseStart)+parseFloat(this.oldWidth);
            parObj.style.width = newWidth+'px';
        }
//NAVIGATE TO NEW OPPORTUNITY
        naviToOpp(id){
            
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: id,
                    actionName: 'view'
                }
            });
        }
}