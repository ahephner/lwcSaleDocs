import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getDetails from '@salesforce/apex/getSalesDetails.getDetails';
import createOp from '@salesforce/apex/getSalesDetails.createOp';
import eopOp from '@salesforce/apex/getSalesDetails.eopOp';
import {isIn} from 'c/utilityHelper';
export default class RelatedDetails extends NavigationMixin(LightningElement){
    @api recordId;
    @api totalNumberOfRows;
    loading = true;
    loadAgain = true;
    newId;
    buildingOrder = false; 
    //search variables
    searchTerm;
    searching = false; 
    @track copyProducts = []; 
    @track selectedProducts = []; 
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

    connectedCallback(){
        this.loadData(); 
        this.loading = false; 
    }

        loadData(){
           return getDetails({limitSize: this.rowLimit, offset: this.rowOffSet, recordId: this.recordId})
            .then((res)=>{
                if(res.length>1){
                    let records
                    let nameURL; 
                    let docName;  
                    let rowVariant; 
                    let btnName; 
                    let showCount; 
                    let visAmount; 
                    records = res.map(row=>{
                        nameURL =  `/${row.Sales_Document__c}`;
                        docName = row.Sales_Document__r.Name;
                        btnName = 'Reorder';
                        rowVariant = 'brand';
                        showCount = false; 
                        visAmount = row.Quantity__c
                        return{...row, nameURL, docName, rowVariant, btnName, showCount, visAmount}
                    })
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
                this.searchTerm.length >= 3 ? this.handleSearch(this.searchTerm)  : this.handleZeroSearch();
                //this.salesDocs = [...this.copyProducts]  
            }, 1000)
        } 

        handleSearch(term){
            
            let filtered = isIn(this.salesDocs, this.searchTerm); 
            
            this.salesDocs = filtered.length > 0 ? filtered : false; 
            this.scrollUp(); 
            this.searching = false; 
        }

        handleZeroSearch(){
            this.salesDocs = [...this.copyProducts];
            this.searching = false; 
        }
        //This fires on the button being cleared on the input search
        handleClear(event){
            if(!event.target.value.length){
                this.handleZeroSearch(); 
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
            
            if(btm >= .8 && this.loadAgain){
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