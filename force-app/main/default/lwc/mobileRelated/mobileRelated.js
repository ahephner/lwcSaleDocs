import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getDetails from '@salesforce/apex/getSalesDetails.getDetails';
import createOp from '@salesforce/apex/getSalesDetails.createOp';
import bestPrice from '@salesforce/apex/getSalesDetails.priorityPricingReOrder'
import getPriceBooks from '@salesforce/apex/omsCPQAPEX.getPriorityPriceBooks';
import eopOp from '@salesforce/apex/getSalesDetails.eopOp';
import {isIn} from 'c/utilityHelper';

export default class MobileRelated extends NavigationMixin(LightningElement){
    @api prop1; 
    @api recordId;
    @api totalNumberOfRows;
    loadingOrder = true;
    loadAgain = true;
    newId;
    
    //search variables
    searchTerm;
    searching = false; 
    @track copyProducts = []; 
    @track selectedProducts = []; 
    //scroll height; 
    sHeight 
    canOrder = false; 
    
    @track salesDocs = [];
    
    rowLimit = 30;
    rowOffSet = 0; 
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
    }
    connectedCallback(){
        this.loadData(); 
        this.loadingOrder = false; 
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
                        visAmount = row.Quantity__c;
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
                    console.log(this.sHeight); 
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
            //this.scrollUp(); 
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
            let topDiv = this.template.querySelector('.topTable');
            let containerChoosen = this.template.querySelector('.topTable');
            containerChoosen.scrollIntoView();
            console.log('scroll up');
        }
                //fields needed for new opp line items
                pbeId; 
                pbId;
                unitPrice;
                pbName; 
                listMargin; 
         
    async   handleRowClick(e){

                let pc = e.target.name; 
                //find index by ID value of selectable products
                let index = this.salesDocs.findIndex(x => x.Id === pc);
                //See if selected product has been 
                let newProd = this.selectedProducts.findIndex(x => x.code === this.salesDocs[index].Product_Code__c);   
                let pPricing =  await bestPrice({priceBookIds: this.normalPriceBooks, productCode: this.salesDocs[index].Product_Code__c})                 
                this.pbeId = pPricing[0].Id;
                this.pbId = pPricing[0].Pricebook2Id;
                this.unitPrice = pPricing[0].UnitPrice;
                this.pbName = pPricing[0].Pricebook2.Name;
                this.listMargin = pPricing[0].List_Margin_Calculated__c;                
                let button = this.salesDocs[index].rowVariant; 
                    if(newProd<0){
                        this.selectedProducts = [
                            ...this.selectedProducts, {
                                code: this.salesDocs[index].Product_Code__c,
                                quantity: this.salesDocs[index].Quantity__c,
                                priceBookEntry: this.pbeId,
                                priceBookName: this.pbName,
                                priceBookId: this.pbId, 
                                unitPrice: this.unitPrice,
                                listMargin: this.listMargin
                            }
                        ]
                        //show user prod selected
                        this.canOrder = true; 
                        this.salesDocs[index].showCount = true;
                        //if they previously selected the product and want to take it out
                    }else if(newProd >=0 && button === 'success'){
                        let removeIndex = this.selectedProducts.findIndex(x => x.code === pc);
                        this.selectedProducts.splice(removeIndex, 1);
                        this.selectedProducts.length > 0 ? this.canOrder = true: this.canOrder = false;  
                        this.salesDocs[index].rowVariant = 'brand';
                        this.salesDocs[index].btnName = 'Reorder';  
                    }else if(newProd >=0){
                        console.log('already there')
                    }
                    console.log(JSON.stringify(this.selectedProducts))
            }
            scrollTest(){
                alert(this.template.querySelector('.cardClass').scrollTop)
            }

       async handleScroll(evt){
            // let btm = evt.target.scrollTop/this.sHeight
            let height = this.template.querySelector('.cardClass');
            let calc = height.scrollTop / height.scrollHeight; 
            if(calc >= .8 && this.loadAgain){
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
            this.loadingOrder = true; 
            createOp({accId: this.recordId, prod: this.selectedProducts})
            .then(res=>{
                this.loadingOrder = false; 
                this.newId = res
                this.naviToOpp(this.newId); 
            }).catch(err=>{
                console.log(err);
            })
            
        }

        eopOrder(){
            this.loadingOrder = true; 
            eopOp({accId: this.recordId, prod: this.selectedProducts})
            .then(res=>{
                this.loading = false; 
                this.newId = res
                this.naviToOpp(this.newId); 
            }).catch(err=>{
                console.log(err);
            })
            
        }

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