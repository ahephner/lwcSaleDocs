import { LightningElement, api, track, wire } from 'lwc';
import getDetails from '@salesforce/apex/getSalesDetails.getDetails';
const columns = [
    {label:'Order', 'fieldName':'nameURL', type:'url', typeAttributes:{label:{fieldName:'docName'}},target:'_blank' },
    {label:'Product', 'fieldName':'Product_Name__c', type:'text'},
    {label: 'Doc Date', 'fieldName': 'Doc_Date__c', type: 'text'}, 
    {label:'Qty', 'fieldName':'Quantity__c', type:'text'},
    {label:'Unit Price', 'fieldName':'Unit_Price__c', type:'text'}
]
export default class RelatedDetails extends LightningElement{
    @api recordId;
    @api totalNumberOfRows;
    columns = columns;
    @track salesDocs = [];
    rowLimit = 5;
    rowOffSet = 0; 

    connectedCallback(){
        this.loadData(); 
    }

        loadData(){
           return getDetails({limitSize: this.rowLimit, offset: this.rowOffSet, recordId: this.recordId})
            .then((res)=>{
                let records
                let nameURL; 
                let docName; 
                records = res.map(row=>{
                    nameURL =  `/${row.Sales_Document__c}`;
                    docName = row.Sales_Document__r.Name;
                    return{...row, nameURL, docName}
                })
                let sorted = records.sort((a,b)=> Date.parse(b.Doc_Date__c) - Date.parse(a.Doc_Date__c))
                let updates = [...this.salesDocs, ...sorted];
                this.salesDocs = updates; 
                console.log(JSON.stringify(this.salesDocs))
            }).catch(err =>{
                console.log('err', err); 
            })
        }

        loadMoreData(event){
           const currentRecord = this.salesDocs; 
           const {target} = event; 
           target.isLoading = true; 
           this.rowOffSet = this.rowOffSet + this.rowLimit;
           this.loadData()
           .then(()=>{
            target.isLoading = false; 
           }) 
            
        }

}