import { LightningElement, api, track, wire } from 'lwc';
import getDetails from '@salesforce/apex/getSalesDetails.getDetails';

export default class RelatedDetails extends LightningElement{
    @api recordId;
    @api totalNumberOfRows;
    loadAgain = true;
    //scroll height; 
    sHeight 
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
    }

        loadData(){
           return getDetails({limitSize: this.rowLimit, offset: this.rowOffSet, recordId: this.recordId})
            .then((res)=>{
                if(res.length>1){
                    let records
                    let nameURL; 
                    let docName; 
                    let rowValue; 
                    let rowVariant; 
                    records = res.map(row=>{
                        nameURL =  `/${row.Sales_Document__c}`;
                        docName = row.Sales_Document__r.Name;
                        rowValue = 'Add';
                        rowVariant = 'brand';
                        return{...row, nameURL, docName, rowValue, rowVariant}
                    })
                    let sorted = records.sort((a,b)=> Date.parse(b.Doc_Date__c) - Date.parse(a.Doc_Date__c))
                    let updates = [...this.salesDocs, ...sorted];
                    this.salesDocs = updates; 
                    this.sHeight = this.template.querySelector('[data-id="outter"]').scrollHeight;
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

        handleRowAction(e){
            console.log(e.target.name)
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

}