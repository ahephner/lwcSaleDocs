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
        Map<String, Integer> prodMap = new Map<String, Integer>();
         
        
        Account accInfo = [select id, Ship_Method__c, Sales_Rep__r.Warehouse__c from account where id =: accId]; 
        
        for(ProdWrapper x: prod){
            prodMap.put(x.code, x.quantity); 
        }
        
		List<PricebookEntry> pbe = [select id from PricebookEntry where ProductCode in: prodMap.keySet()];        
        return 'back apex'; 
    }
}