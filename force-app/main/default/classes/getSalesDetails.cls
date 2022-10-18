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
        String pricebookId = '01s410000077vSKAAY';
        String pClass = 'Simple'; 
        string recType = '01275000000CgcYAAS';
        string newOppId; 
        Map<String, Integer> prodMap = new Map<String, Integer>();
        list<OpportunityLineItem> lineItems = new List<OpportunityLineItem>();  
        Savepoint sp = Database.setSavepoint();
        try{
        Account accInfo = [select id, Name, Ship_Method__c, Sales_Rep__r.Warehouse__c, Sales_Rep__C from account where id =: accId]; 
        Opportunity opp = new Opportunity(name= accInfo.Name + ' '+ Date.today().format(),
                                          accountId = accInfo.Id,
                                          CloseDate = Date.today(),
                                          PriceBook2Id = pricebookId,
                                          RecordTypeId = recType,
                                          Sales_Rep__c = accInfo.Sales_Rep__c,
                                          Ship_Type__c = accInfo.Ship_Method__c,
                                          StageName = 'Working',
                                          Warehouse__c = accInfo.Sales_Rep__r.Warehouse__c
                                         );	
            insert opp;
            newOppId = opp.Id; 
        for(ProdWrapper x: prod){
            prodMap.put(x.code, x.quantity); 
        }
        
		List<PricebookEntry> pbe = [select id, Floor_Price__c, ProductCode, Product2.Name, Product2.Product_Status__c, Agency_Product__c,
                                    Product2.Product_Family__c, Product2.Subcategory__c, Product2.Ship_Weight__c, Product2.Pallet_Qty__c,
                                    Level_1_UserView__c, Level_One_Margin__c, Level_2_UserView__c, Level_2_Margin__c, Product_Cost__c
                                    from PricebookEntry where isActive = True AND ProductCode in: prodMap.keySet() AND Product2.ProductClass =:pClass
                                   AND Pricebook2Id =: priceBookId];  
            
            for(PriceBookEntry y: pbe){
                if(y.Agency_Product__c == True){
                    lineItems.add(new OpportunityLineItem(
                    	Product2Id = y.Id,
                		OpportunityId = opp.Id,
                    	CPQ_Unit_Price__c = y.Floor_Price__c,
                    	CPQ_Margin__c = 0,
                    	Cost__c = y.Product_Cost__c,
                  		UnitPrice = y.Floor_Price__c,
                		Quantity = prodMap.get(y.ProductCode)
                )); 
                }else{
                    lineItems.add(new OpportunityLineItem(
                    	Product2Id = y.Id,
                		OpportunityId = opp.Id,
                    	CPQ_Unit_Price__c = y.Level_2_UserView__c,
                    	CPQ_Margin__c = y.Level_2_Margin__c,
                    	Cost__c = y.Product_Cost__c,
                  		UnitPrice = y.Level_2_UserView__c,
                		Quantity = prodMap.get(y.ProductCode)
                )); 
                }            
            }          
            
            if(lineItems.size()>0){
                insert lineItems; 
            }
        }catch(exception e){
               Database.rollback(sp);
               ApexPages.addMessages(e); 
               return null;
        }
 		return newOppId;
    }
}