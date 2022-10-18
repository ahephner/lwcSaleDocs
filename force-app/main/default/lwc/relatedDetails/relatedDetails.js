import { LightningElement, api, track, wire } from 'lwc';
import getDetails from '@salesforce/apex/getSalesDetails.getDetails';
import createOp from '@salesforce/apex/getSalesDetails.createOp'
export default class RelatedDetails extends LightningElement{
    @api recordId;
    @api totalNumberOfRows;
    loading = true;
    loadAgain = true;
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
                    this.sHeight = this.template.querySelector('[data-id="outter"]').scrollHeight;
                    this.loading = false; 
                }else{
                    console.log('all done');
                    
                    this.loadAgain = false; 
                }

            }).catch(err =>{
                console.log('err', err); 
            })
        }

        loadMoreData(event){
           const currentRecord = this.salesDocs; 
           //const {target} = event; 
           //target.isLoading = true; 
           this.rowOffSet = this.rowOffSet + this.rowLimit;
           this.loadData()
        //    .then(()=>{
        //     //target.isLoading = false;
        //     console.log() 
        //    }) 
            
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
                console.log(1, btm);
                console.log(2, this.sHeight); 
            
            if(btm >= .8 && this.loadAgain){
                console.log('in load more');
                 
                //this.loadMoreData(); 
            }
        
        }

        makeOrder(){
            createOp({accId: this.recordId, prod: this.selectedProducts})
            .then(res=>{
                console.log(res)
                this.loading = false; 
            }).catch(err=>{
                console.log(err);
            })
            
        }

}