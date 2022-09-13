import { LightningElement, api } from 'lwc';
import getDetails from '@salesforce/apex/getSalesDetails.methodName';
export default class RelatedDetails extends LightningElement{
    @api recordId; 
}