import { expect, it } from "vitest"
import { readAllPages } from "./read-all-pages"

it("reads every bounded page and does not hide a later page failure",async()=>{
  const rows=Array.from({length:1103},(_,id)=>({id}))
  const ranges:number[][]=[]
  const result=await readAllPages(async(from,to)=>{ranges.push([from,to]);return {data:rows.slice(from,to+1),error:null}})
  expect(result.data?.length).toBe(1103)
  expect(ranges).toEqual([[0,499],[500,999],[1000,1499]])
  const failed=await readAllPages(async(from)=>from?{data:null,error:{message:"offline"}}:{data:rows.slice(0,500),error:null})
  expect(failed.data).toBeNull();expect(failed.error).toEqual({message:"offline"})
})
