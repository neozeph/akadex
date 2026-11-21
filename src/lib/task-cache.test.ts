import { afterEach, expect, it, vi } from "vitest"
import { dehydrate, hydrate } from "@tanstack/react-query"
import rows from "../../docs/specs/results/fixtures/06-task-query-rows.json"
import { makeTaskQueryClient, taskQueryKey, optimisticCompletion, rollbackCompletion, reconcileCompletion, projectPendingTasks, fetchCachedTaskPage } from "./task-cache"
import type { TaskRecord } from "@/components/tasks/task-card"

const filters = { q:"",status:"",subject:"",priority:"" }
const task = { ...rows[0], recurrence_type:null } as TaskRecord
const clients: ReturnType<typeof makeTaskQueryClient>[] = []
function client() { const value=makeTaskQueryClient(); clients.push(value); return value }
afterEach(()=>{clients.forEach((value)=>value.clear());clients.length=0;vi.restoreAllMocks();vi.unstubAllGlobals()})

it("separates account, filters, and pagination keys and creates isolated server clients",()=>{
  expect(taskQueryKey("a",filters,1)).not.toEqual(taskQueryKey("b",filters,1))
  expect(taskQueryKey("a",filters,1)).not.toEqual(taskQueryKey("a",{...filters,status:"done"},1))
  expect(taskQueryKey("a",filters,1)).not.toEqual(taskQueryKey("a",filters,2))
  const a=client(), b=client(); a.setQueryData(taskQueryKey("a",filters,1),{tasks:[task],hasNext:false})
  expect(b.getQueryData(taskQueryKey("a",filters,1))).toBeUndefined()
})
it("hydrates a fresh page without duplicate reads and refetches after 45 seconds",async()=>{
  const clock=vi.spyOn(Date,"now").mockReturnValue(100000)
  const server=client(), browser=client(), key=taskQueryKey("a",filters,1)
  server.setQueryData(key,{tasks:[task],hasNext:false}); hydrate(browser,dehydrate(server))
  let reads=0
  const options={queryKey:key,queryFn:async()=>{reads++;return {tasks:[task],hasNext:false}}}
  await browser.fetchQuery(options); await browser.fetchQuery(options); expect(reads).toBe(0)
  clock.mockReturnValue(145001); await browser.fetchQuery(options); expect(reads).toBe(1)
})
it("rolls back only the failed task while retaining a concurrent successful completion",()=>{
  const cache=client(), key=taskQueryKey("a",filters,1), other={...task,id:rows[1].id,title:rows[1].title}
  cache.setQueryData(key,{tasks:[task,other],hasNext:false})
  const failed=optimisticCompletion(cache,"a",task,true)
  const succeeded=optimisticCompletion(cache,"a",other,true)
  reconcileCompletion(cache,"a",other,{id:other.id,status:"done",due_date:other.due_date},succeeded)
  rollbackCompletion(cache,failed)
  expect(cache.getQueryData(key)).toMatchObject({tasks:[{id:task.id,status:task.status}]})
})
it("keeps recurring tasks until acknowledgement and reconciles the server's next date",()=>{
  const cache=client(), key=taskQueryKey("a",filters,1), recurring={...task,series_id:"series",due_date:"2030-01-01"}
  cache.setQueryData(key,{tasks:[recurring],hasNext:false})
  const snapshot=optimisticCompletion(cache,"a",recurring,true)
  expect(cache.getQueryData(key)).toMatchObject({tasks:[{due_date:"2030-01-01"}]})
  reconcileCompletion(cache,"a",recurring,{id:recurring.id,status:"todo",due_date:"2030-01-02"},snapshot)
  expect(cache.getQueryData(key)).toMatchObject({tasks:[{due_date:"2030-01-02"}]})
})
it("retains pending intent if a background read returns the old row",()=>{
  expect(projectPendingTasks([task],filters,[{task,completed:true}])).toEqual([])
})
it("propagates query cancellation to the actual fetch signal",async()=>{
  const cache=client(), aborts:string[]=[]
  vi.stubGlobal("fetch",async(_input:unknown,init:RequestInit)=>new Promise((_resolve,reject)=>{init.signal?.addEventListener("abort",()=>{aborts.push("aborted");reject(new DOMException("Aborted","AbortError"))})}))
  const pending=cache.fetchQuery({queryKey:taskQueryKey("a",filters,1),queryFn:({signal})=>fetchCachedTaskPage("a",filters,1,signal,()=>{})}).catch(()=>null)
  await cache.cancelQueries({queryKey:["tasks","a"]});await pending;expect(aborts).toEqual(["aborted"])
})
it("rejects a response belonging to another account before caching it",async()=>{
  let cleared=false
  vi.stubGlobal("fetch",async()=>new Response(JSON.stringify({userId:"b",tasks:[task],hasNext:false})))
  await expect(fetchCachedTaskPage("a",filters,1,new AbortController().signal,()=>{cleared=true})).rejects.toThrow()
  expect(cleared).toBe(true)
})
it("refreshes the account calendar separately from reusable task rows",async()=>{
  let calendar:unknown
  vi.stubGlobal("fetch",async()=>new Response(JSON.stringify({userId:"a",tasks:[task],hasNext:false,todayISO:"2026-11-21",timeZone:"Asia/Manila"})))
  const page=await fetchCachedTaskPage("a",filters,1,new AbortController().signal,()=>{},(value:unknown)=>{calendar=value})
  expect(calendar).toEqual({todayISO:"2026-11-21",timeZone:"Asia/Manila"})
  expect(page).not.toHaveProperty("todayISO")
})
it("ignores an aborted response before it can clear a newer account",async()=>{
  const controller=new AbortController();let cleared=false
  vi.stubGlobal("fetch",async()=>{controller.abort();return new Response(JSON.stringify({userId:"b",tasks:[task],hasNext:false}))})
  await expect(fetchCachedTaskPage("a",filters,1,controller.signal,()=>{cleared=true})).rejects.toThrow()
  expect(cleared).toBe(false)
})
