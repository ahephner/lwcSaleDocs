import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getDetails from '@salesforce/apex/getSalesDetails.getDetails';
import createOp from '@salesforce/apex/getSalesDetails.createOp';
import {isIn} from 'c/utilityHelper';

export default class MobileRelated extends LightningElement {
    @api prop1; 
    @api recordId;
    @api totalNumberOfRows;
    loading = true;
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
                    records = res.map(row=>{
                        nameURL =  `/${row.Sales_Document__c}`;
                        docName = row.Sales_Document__r.Name;
                        btnName = 'Reorder';
                        rowVariant = 'brand';
                        return{...row, nameURL, docName, rowVariant, btnName}
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
            let topDiv = this.template.querySelector('.topTable');
            let containerChoosen = this.template.querySelector('.topTable');
            containerChoosen.scrollIntoView();
            console.log('scroll up');
        }
         handleRowClick(e){

            let pc = e.target.name; 
            //find index by ID value of selectable products
            let index = this.salesDocs.findIndex(x => x.Id === pc);
            //See if selected product has been 
            let newProd = this.selectedProducts.findIndex(x => x.code === this.salesDocs[index].Product_Code__c);                  
            let button = this.salesDocs[index].rowVariant; 
                if(newProd<0){
                    this.selectedProducts = [
                        ...this.selectedProducts, {
                             code: this.salesDocs[index].Product_Code__c,
                             quantity: this.salesDocs[index].Quantity__c
                        }
                    ]
                    //show user prod selected
                    this.canOrder = true; 
                    this.salesDocs[index].rowVariant = 'success';
                    this.salesDocs[index].btnName = 'added';
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

       async handleScroll(evt){
            let btm = evt.target.scrollTop/this.sHeight
            
            if(btm >= .8 && this.loadAgain){
                console.log('in load more'); 
                this.loadMoreData(); 
            }
        
        }

        makeOrder(){
            this.loading = true; 
            createOp({accId: this.recordId, prod: this.selectedProducts})
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