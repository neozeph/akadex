// For report metadata that must retain its existing application calculations.
// Callers provide a stable ordering; activity histories use SQL aggregates instead.
export async function readAllPages<T,E>(read:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:E|null}>) {
  const rows:T[]=[]
  for(let from=0;;from+=500){
    const result=await read(from,from+499)
    if(result.error || !Array.isArray(result.data))return {data:null,error:result.error??new Error("Missing rows")}
    rows.push(...result.data)
    if(result.data.length<500)return {data:rows,error:null}
  }
}
