//This is a general helper file. Used for one off functions

//search helper for reorder entry
const isIn = (obj, term)=>{
    
    let search = obj.filter((obj) =>{
        return obj.Product_Code__c.toLowerCase().includes(term.toLowerCase()) || obj.Product_Name__c.toLowerCase().includes(term.toLowerCase())
    })
    return search; 
}

export{isIn}