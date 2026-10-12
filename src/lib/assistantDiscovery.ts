export function shuffleDiscovery<T extends {id:number}>(products:T[],excluded:number[],previousFirst?:number,random= Math.random):T[]{
 const seen=new Set<number>();const blocked=new Set(excluded)
 const result=products.filter(p=>Number.isSafeInteger(p.id)&&!blocked.has(p.id)&&!seen.has(p.id)&&Boolean(seen.add(p.id)))
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 if(result.length>1 && result[0].id===previousFirst)result.push(result.shift()!)
 return result
}

export function nextDiscoveryStep(page:number,pages:number,sourcePage:number,totalPages:number){
 if(page<pages-1)return {page:page+1,sourcePage,cycleComplete:false}
 if(sourcePage<totalPages)return {page:0,sourcePage:sourcePage+1,cycleComplete:false}
 return {page:0,sourcePage:1,cycleComplete:true}
}
