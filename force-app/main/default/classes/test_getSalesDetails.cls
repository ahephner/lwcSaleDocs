@isTest
public class test_getSalesDetails {
    static testMethod void testDetails(){
        //account
       
        Account cust = new Account();
        cust.Name = 'Test123456';
        cust.RecordTypeId = '01241000001Dy64AAC';
        cust.Customer_Name__c = 'Test Customer 123456';
        	insert cust;
    	//Sales Rep
    	Sales_Rep__c sr = new Sales_Rep__c(Name='Rep', Sales_Rep_Num__c='12');
    	insert sr; 
        //contact
        contact person = new contact(lastname = 'test', AccountId = cust.Id);
        insert person; 
        //date and pricebook don't know if you need it just incase 
        Date myDate = Date.newInstance(2040, 1, 4);
        Date startdate = Date.newInstance(2040, 1, 3);
        Id pricebookId = Test.getStandardPricebookId();
        //sales doc
        Sales_Document__c head = new Sales_Document__c(name = 'test name', customer__c = cust.id, Doc_Type__c = 'Invoice', 
                                                       Sales_Doc_Num__c = '12345',Sales_Rep__c= sr.Id,Number_of_Payments__c =1,
                                                       Doc_Date__c = myDate, Doc_Amount__c=1.00,Payment_Terms__c = 'SEE SPLIT TERMS' );
	
        insert head;
    
        //insert products 
        product__c p = new product__c(Name='xyz', Product_Name__c = 'product', Active__c=True);
        //product__c pr = new product__c(Name='jdt-12', ProductCode =  'xyz');
        insert p;
       // insert pr; 
        
    //doc detail
        Sales_Doc_Detail__c detail =  new Sales_Doc_Detail__c(name='test', Sales_Document__c=head.id, Product__c = p.Id, Quantity__c=1, Unit_Price__c=1);
         insert detail;       
   
   //this is for query limits passed in from 
   		integer limits = 25;
        integer off = 0;
        test.startTest();
        	list<Sales_Doc_Detail__c> details = getSalesDetails.getDetails(limits, off, cust.Id);
        	list<Sales_Doc_Detail__c> searchRes = getSalesDetails.fallBack(cust.id, p.name);
        test.stopTest(); 
    }
    
    @isTest()
    static void test_relatedDetails(){
        PageReference pref = Page.oppCloneWithProducts;
        Test.setCurrentPage(pref);
        //date for opp
        Date myDate = Date.newInstance(2040, 1, 4);
		//create test customer
        Account cust = new Account();
        cust.Name = 'Test123456';
        cust.Type = 'Customer';
        cust.Customer_Name__c = 'Test Customer 123456';
        insert cust;
        //product creation
        Id pricebookId = Test.getStandardPricebookId();

        //create product2 that is active
        product2 prod = new product2(name ='product', IsActive= True); 
        insert prod; 
        
        PricebookEntry pbe = new PricebookEntry(Pricebook2Id = pricebookId, Product2Id=prod.id,
                                                 unitprice=4, IsActive = True, UseStandardPrice=False);
        insert pbe; 
//create product2 that will be deactivated
        product2 widget = new product2(name ='widget',ProductCode='BA12', IsActive= True, Agency_Pricing__c=true); 
        insert widget; 
        
        
        PricebookEntry widgetpbe = new PricebookEntry(Pricebook2Id = pricebookId, Product2Id=widget.id,
                                                 unitprice=4, IsActive = True, UseStandardPrice=False);
        insert widgetpbe; 
 //normal product
         product2 rake = new product2(name ='rake', IsActive= True, Agency_Pricing__c=false); 
        insert rake; 
        
        PricebookEntry rakepbe = new PricebookEntry(Pricebook2Id = pricebookId, Product2Id=rake.id,
                                                 unitprice=4, IsActive = True, UseStandardPrice=False);
        insert rakepbe;  
 //zero margin
        product2 shovel = new product2(name ='shovel',ProductCode='AT12', IsActive= True, Agency_Pricing__c=false, Product_Category__c = 'Packaged Product'); 
        insert shovel; 
        
        PricebookEntry shovelpbe = new PricebookEntry(Pricebook2Id = pricebookId, Product2Id=shovel.id,
                                                 unitprice=4, IsActive = True, UseStandardPrice=False);
        insert shovelpbe; 
//shipping charge
        product2 ship = new product2(name='ATS SHIPPING', ProductCode= 'ATS-SHIPPING', IsActive=True, Product_Category__c='ATS Shipping');
        insert ship; 
        
        PricebookEntry shipPBE = new PricebookEntry(Pricebook2Id = pricebookId, Product2Id=ship.id,
                                                 unitprice=4, IsActive = True, UseStandardPrice=False); 
        insert shipPBE; 
        //create test opportunity
        opportunity opp = new opportunity(name = 'test name', accountID= cust.id, pricebook2id = pricebookId,
                                         stagename='Estimate(10%)', job_type__c = 'Construction', closedate = myDate);
       
        //insert w/o synced quote
        insert opp; 
       
//opportunitylineitem
        opportunitylineitem li = new opportunitylineitem(opportunityid = opp.id, product2id = prod.Id, PricebookEntryId=pbe.id,
                                                         unitprice= 4, quantity= 3, CPQ_Unit_Price__c= 4, CPQ_Margin__c=100); 
        insert li; 
        opportunitylineitem widgetli = new opportunitylineitem(opportunityid = opp.id, product2id = widget.Id, PricebookEntryId=widgetpbe.id,
                                                         unitprice= 4, quantity= 3, CPQ_Unit_Price__c = 4, CPQ_Margin__c=0.00); 
        insert widgetli;
        
        opportunitylineitem rakeli = new opportunitylineitem(opportunityid = opp.id, product2id = widget.Id, PricebookEntryId=rakepbe.id,
                                                          unitprice= 4, quantity= 3, CPQ_Unit_Price__c = 4, CPQ_Margin__c=10); 
        insert rakeli; 
        
        opportunitylineitem shovelli = new opportunitylineitem(opportunityid = opp.id, product2id = widget.Id, PricebookEntryId=shovelpbe.id,
                                                          unitprice= 4, quantity= 3, CPQ_Unit_Price__c = 4, CPQ_Margin__c=0.00); 
        insert shovelli;
                
        opportunitylineitem shipli = new opportunitylineitem(opportunityid = opp.id, product2id = widget.Id, PricebookEntryId=shipPBE.id,
                                                          unitprice= 4, quantity= 3, CPQ_Unit_Price__c = 4, CPQ_Margin__c=0.00); 
        insert shipli;
     //wrapper for method
		list<getSalesDetails.ProdWrapper> wrapList = new list<getSalesDetails.ProdWrapper>();
        
        getSalesDetails.ProdWrapper wrap1 = new getSalesDetails.ProdWrapper();
        wrap1.code = shovel.ProductCode;
        wrap1.quantity = 2; 

     //need an agency product
        getSalesDetails.ProdWrapper wrap2 = new getSalesDetails.ProdWrapper();
        wrap2.code = widget.ProductCode;
        wrap2.quantity = 2; 
        
        wrapList.add(wrap1);
        wrapList.add(wrap2); 
        
        Test.startTest();
			getSalesDetails.createOp(cust.Id, wrapList);
			getSalesDetails.eopOp(cust.Id, wrapList);
         test.stopTest();   

    }
}