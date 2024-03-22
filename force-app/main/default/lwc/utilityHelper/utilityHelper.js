//This is a general helper file. Used for one off functions

//search helper for reorder entry
const isIn = (obj, term)=>{
    
    let search = obj.filter((obj) =>{
        return obj.Product_Code__c.toLowerCase().includes(term.toLowerCase()) || obj.Product_Name__c.toLowerCase().includes(term.toLowerCase())
    })
    return search; 
}

const locIsIn = (obj, term)=>{
    let search = obj.filter((obj) =>{
    return obj.location.toLowerCase().includes(term.toLowerCase());
    });
    return search;     
}

const repIsIn = (obj, term)=>{
    let search = obj.filter((obj) =>{
    return obj.salesRep.toLowerCase().includes(term.toLowerCase());
    })
    return search; 
}
//obj = sales data, searchTerm is product or code term Is wareHouse or Rep field is key field to search 
const termPlus =(obj, searchTerm, term, field)=>{
    let search = obj.filter((obj)=>{
        return (obj.Product_Code__c.toLowerCase().includes(searchTerm.toLowerCase()) || obj.Product_Name__c.toLowerCase().includes(searchTerm.toLowerCase()))&& 
        obj[field].toLowerCase().includes(term.toLowerCase())
    })
    return search
}

const repLocation = (obj, rep, location) =>{
    let search = obj.filter((obj)=>{
        return (obj.salesRep.toLowerCase().includes(rep.toLowerCase()) && obj.location.toLowerCase().includes(location.toLowerCase()))
    })
    return search
}

const allThree =(obj, searchTerm, rep, location)=>{
    let search = obj.filter((obj)=>{
        return (obj.Product_Code__c.toLowerCase().includes(searchTerm.toLowerCase()) || obj.Product_Name__c.toLowerCase().includes(searchTerm.toLowerCase()))&& 
        obj.salesRep.toLowerCase().includes(rep.toLowerCase()) && obj.location.toLowerCase().includes(location.toLowerCase())
    })
    return search
}
export{
    isIn,
    locIsIn,
    repIsIn, 
    termPlus,
    repLocation,
    allThree
}