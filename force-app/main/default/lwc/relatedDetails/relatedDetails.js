import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getDetails from '@salesforce/apex/getSalesDetails.getDetails';
import createOp from '@salesforce/apex/getSalesDetails.createOp';
import {isIn} from 'c/utilityHelper';
export default class RelatedDetails extends NavigationMixin(LightningElement){
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
            
            this.delayedTimeout = setTimeout(()=>{
                this.searching = true; 
                this.searchTerm = queryTerm; 
                console.log(this.searchTerm, this.searchTerm.length)
                this.searchTerm.length >= 3 ? this.handleSearch(this.searchTerm) : this.salesDocs = [...this.copyProducts]; 
            }, 1000)
        } 

        handleSearch(term){
            console.log(2, this.searchTerm)
            let filtered = isIn(this.salesDocs, this.searchTerm); 
            console.log(filtered.length, filtered)
            this.salesDocs = filtered.length > 0 ? filtered : this.salesDocs; 
            this.searching = false; 
        }

         handleRowClick(e){
            let pc = e.target.name; 
            let index = this.salesDocs.findIndex(x => x.Product_Code__c === pc);
            let newProd = this.selectedProducts.findIndex(x => x.code === pc);                  
            
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
                }else{
                    let removeIndex = this.selectedProducts.findIndex(x => x.code === pc);
                    this.selectedProducts.splice(removeIndex, 1);
                    this.selectedProducts.length > 0 ? this.canOrder = true: this.canOrder = false;  
                    this.salesDocs[index].rowVariant = 'brand';
                    this.salesDocs[index].btnName = 'Reorder'; 
                }
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