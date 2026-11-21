import { QueryClient, hashKey, type QueryKey } from "@tanstack/react-query"
import type { TaskRecord } from "@/components/tasks/task-card"
import { taskPageHref, type TaskFilters } from "@/lib/task-query"

export type TaskPage = { tasks: TaskRecord[]; hasNext: boolean }
export type CompletionState = Pick<TaskRecord,"id"|"status"|"due_date"> | null
export type PendingCompletion = { task: TaskRecord; completed: boolean }
type Snapshot = { key: QueryKey; task: TaskRecord; index: number }[]
export const TASK_STALE_TIME = 45_000
export function makeTaskQueryClient() {
  return new QueryClient({defaultOptions:{queries:{staleTime:TASK_STALE_TIME,gcTime:typeof window==="undefined"?Infinity:300_000,retry:false},mutations:{retry:false}}})
}
export const taskQueryKey = (account:string, filters:TaskFilters, page:number) => ["tasks",account,filters,page] as const
const matchesStatus = (status:string, filters:TaskFilters) => filters.status ? status===filters.status : status!=="done"

export function optimisticCompletion(client:QueryClient, account:string, task:TaskRecord, completed:boolean):Snapshot {
  const snapshots:Snapshot=[]
  for(const [key,data] of client.getQueriesData<TaskPage>({queryKey:["tasks",account]})) {
    const index=data?.tasks.findIndex((row)=>row.id===task.id) ?? -1
    if(!data || index<0)continue
    snapshots.push({key,task:data.tasks[index],index})
    if(task.series_id)continue
    const filters=key[2] as TaskFilters
    client.setQueryData<TaskPage>(key,{...data,tasks:data.tasks.flatMap((row)=>row.id!==task.id ? [row] : matchesStatus(completed?"done":"todo",filters) ? [{...row,status:completed?"done":"todo"}] : [])})
  }
  return snapshots
}
export function rollbackCompletion(client:QueryClient, snapshots:Snapshot) {
  for(const snapshot of snapshots) client.setQueryData<TaskPage>(snapshot.key,(data)=>{
    if(!data)return data
    const tasks=data.tasks.filter((row)=>row.id!==snapshot.task.id)
    tasks.splice(Math.min(snapshot.index,tasks.length),0,snapshot.task)
    return {...data,tasks}
  })
}
export function reconcileCompletion(client:QueryClient, account:string, task:TaskRecord, state:CompletionState, snapshots:Snapshot) {
  for(const [key,data] of client.getQueriesData<TaskPage>({queryKey:["tasks",account]})) {
    if(!data)continue
    const current=data.tasks.find((row)=>row.id===task.id)
    const previous=snapshots.find((snapshot)=>hashKey(snapshot.key)===hashKey(key))
    if(!current && !previous)continue
    const updated=state ? {...(current??previous!.task),...state} : null
    const tasks=data.tasks.filter((row)=>row.id!==task.id)
    if(updated && matchesStatus(updated.status,key[2] as TaskFilters)) tasks.splice(Math.min(current?data.tasks.indexOf(current):previous!.index,tasks.length),0,updated)
    client.setQueryData<TaskPage>(key,{...data,tasks})
  }
}
export function projectPendingTasks(tasks:TaskRecord[], filters:TaskFilters, pending:PendingCompletion[]) {
  return tasks.flatMap((task)=>{
    const intent=pending.find((value)=>value.task.id===task.id)
    if(!intent || task.series_id)return [task]
    const status=intent.completed?"done":"todo"
    return matchesStatus(status,filters)?[{...task,status}]:[]
  })
}
export async function fetchCachedTaskPage(account:string, filters:TaskFilters, page:number, signal:AbortSignal, sessionLost:()=>void, calendarChanged?:(calendar:{todayISO:string;timeZone:string})=>void):Promise<TaskPage> {
  const href=taskPageHref(filters,page).replace(/^\/tasks/,"/api/tasks")
  const response=await fetch(href,{signal,cache:"no-store",headers:{"x-akadex-account":account}})
  if(signal.aborted)throw new DOMException("Aborted","AbortError")
  if(response.status===401 || response.status===409){sessionLost();throw new Error("Account session changed")}
  if(!response.ok)throw new Error("Unable to load your tasks right now.")
  const data=await response.json()
  if(signal.aborted)throw new DOMException("Aborted","AbortError")
  if(data.userId!==account){sessionLost();throw new Error("Account session changed")}
  if(!Array.isArray(data.tasks) || typeof data.hasNext!=="boolean")throw new Error("Unable to load your tasks right now.")
  if(calendarChanged){
    if(typeof data.todayISO!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.todayISO) || typeof data.timeZone!=="string")throw new Error("Unable to load your calendar preferences.")
    calendarChanged({todayISO:data.todayISO,timeZone:data.timeZone})
  }
  return {tasks:data.tasks,hasNext:data.hasNext}
}
