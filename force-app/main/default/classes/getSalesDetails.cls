public with sharing class getSalesDetails {
    @AuraEnabled(cacheable=true)
    public static list<Sales_Doc_Detail__c> getDetails(Integer limitSize, Integer offset, String recordId){
        list<Sales_Doc_Detail__c> related = [Select Id, Name, Product__c, Product_Name__c, Doc_Date__c, 
        Product_Code__c,Quantity__c, Sales_Document__c, Sales_Document__r.Name, Unit_Price__c, Product__r.Product_Cost__c
        from Sales_Doc_Detail__c
        where Account__c =: recordId ORDER BY Doc_Date__c DESC
        LIMIT :limitSize
        OFFSET :offset];  

        return related; 
    }
    //wrapper to accept params from lwc
    public class ProdWrapper{
        @AuraEnabled 
        public string code {get;set;}
        @AuraEnabled
        public integer quantity {get; set;}
    }
    
    @AuraEnabled
    public static string createOp(string accId, list<ProdWrapper> prod){
        system.debug('id '+accId);
        system.debug(prod); 
        return 'back apex'; 
    }
}