"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useMutationState, useQuery } from "@tanstack/react-query"
import { useTaskAccount } from "./task-cache-provider"
import { TaskBoard } from "./task-board"
import { TaskLink } from "./task-link"
import { TasksSearchToolbar } from "./tasks-search-toolbar"
import { CreateTaskDialog } from "./create-task-dialog"
import type { TaskRecord } from "./task-card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { RouteLoading } from "@/components/ui/route-loading"
import { useToast } from "@/components/ui/toast-provider"
import TasksError from "@/app/(dashboard)/tasks/error"
import { completeCachedTask, createCachedTask, updateCachedTask, deleteCachedTask } from "@/app/(dashboard)/tasks/actions"
import { parseTaskQuery, taskPageHref, TASK_PAGE_SIZE, type TasksSearchParams } from "@/lib/task-query"
import { fetchCachedTaskPage, taskQueryKey, optimisticCompletion, rollbackCompletion, reconcileCompletion, projectPendingTasks } from "@/lib/task-cache"

type Completion = {task:TaskRecord;completed:boolean;form:FormData}
export function TaskWorkspace({subjects,todayISO,timeZone}:{subjects:{id:string;code:string;label:string}[];todayISO:string;timeZone:string}) {
  const account=useTaskAccount(), client=account.client
  const notify=useToast()
  const params=useSearchParams(), input:TasksSearchParams={}
  for(const key of ["q","status","subject","priority","page"] as const){const values=params.getAll(key);input[key]=values.length>1?values:values[0]}
  const {filters,page,invalid}=parseTaskQuery(input)
  const prefix=["tasks",account.userId], mutationKey=["task-completion",account.userId]
  const [failures,setFailures]=useState<Record<string,Completion>>({})
  const [calendar,setCalendar]=useState({todayISO,timeZone})
  useEffect(()=>{queueMicrotask(()=>setCalendar({todayISO,timeZone}))},[todayISO,timeZone])
  const inFlight=useRef(new Map<string,Promise<unknown>>())
  const pending=useMutationState<Completion>({filters:{mutationKey,status:"pending"},select:(mutation)=>mutation.state.variables as Completion})
  const query=useQuery({queryKey:taskQueryKey(account.userId,filters,page),queryFn:({signal})=>fetchCachedTaskPage(account.userId,filters,page,signal,account.sessionLost,(value)=>{if(account.isCurrent())setCalendar(value)}),refetchOnWindowFocus:()=>client.isMutating({mutationKey})===0})
  const completion=useMutation({
    mutationKey,
    mutationFn:(variables:Completion)=>completeCachedTask(account.userId,variables.form),
    onMutate:async(variables)=>{
      await client.cancelQueries({queryKey:prefix})
      setFailures((current)=>{const next={...current};delete next[variables.task.id];return next})
      return account.isCurrent()?optimisticCompletion(client,account.userId,variables.task,variables.completed):[]
    },
    onSuccess:(result,variables,snapshot)=>{
      if(!account.isCurrent())return
      if(result.accountChanged){account.sessionLost();return}
      if(result.task && result.task.id!==variables.task.id)throw new Error("Unexpected completion response")
      reconcileCompletion(client,account.userId,variables.task,result.task,snapshot??[])
      notify(variables.completed?"Task completed.":"Task reopened.")
    },
    onError:(_error,variables,snapshot)=>{
      if(!account.isCurrent())return
      rollbackCompletion(client,snapshot??[])
      setFailures((current)=>({...current,[variables.task.id]:variables}))
      notify("Could not save completion. Try again.",true)
    },
    onSettled:()=>{
      if(account.isCurrent() && client.isMutating({mutationKey})===1)return client.invalidateQueries({queryKey:prefix})
    },
  })
  async function saveCompletion(variables:Completion){
    const existing=inFlight.current.get(variables.task.id)
    if(existing){await existing.catch(()=>{});return}
    const saving=completion.mutateAsync(variables)
    inFlight.current.set(variables.task.id,saving)
    try{await saving}catch{/* Inline failure and row-scoped rollback are handled above. */}
    finally{inFlight.current.delete(variables.task.id)}
  }
  async function changeTask(action:typeof createCachedTask, form:FormData){
    let result:Awaited<ReturnType<typeof createCachedTask>>
    try{result=await action(account.userId,form)}catch(error){
      if(account.isCurrent())notify("Could not save task. Try again.",true)
      throw error
    }
    if(!account.isCurrent())return
    if(result.accountChanged){account.sessionLost();return}
    notify(action===deleteCachedTask?"Task deleted.":action===createCachedTask?"Task created.":"Task updated.")
    await client.invalidateQueries({queryKey:prefix})
  }
  const tasks=projectPendingTasks(query.data?.tasks??[],filters,pending)
  const hasFilters=Boolean(filters.q||filters.status||filters.subject||filters.priority)
  return <div className="space-y-4">
    <PageHeader title="Tasks" description="Manage your academic and personal tasks." action={<CreateTaskDialog onCreate={(form)=>changeTask(createCachedTask,form)} subjects={subjects}/>}/>
    <section className="rounded-xl border border-border bg-card p-2.5 shadow-sm"><TasksSearchToolbar key={JSON.stringify(filters)} searchParams={filters} subjects={subjects} hasActiveFilters={hasFilters} pending={query.isFetching}/></section>
    {invalid?<p role="status" className="text-sm text-muted-foreground">Invalid filters were ignored. Search accepts up to 200 characters; pages must be positive whole numbers.</p>:null}
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{pending.length?`Saving ${pending.length} task completion${pending.length===1?"":"s"}...`:query.isFetching&&query.data?"Refreshing tasks...":""}</p>
    {Object.values(failures).map((failure)=><div key={failure.task.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-3"><div><p role="alert" className="text-sm text-destructive">Could not save completion. Your task was restored. Retry.</p><p className="text-xs text-muted-foreground">{failure.task.title}</p></div><Button variant="outline" size="sm" aria-label={`Retry completion for ${failure.task.title}`} disabled={pending.some((value)=>value.task.id===failure.task.id)} onClick={()=>void saveCompletion(failure)}>Retry completion</Button></div>)}
    {query.isError?<TasksError unstable_retry={()=>query.refetch()}/>:null}
    {query.isPending?<RouteLoading/>:query.data?<>
      <nav aria-label="Task pages" className="flex flex-wrap items-center gap-3"><p className="mr-auto text-sm text-muted-foreground">{tasks.length?`Page ${page} · Showing ${(page-1)*TASK_PAGE_SIZE+1}–${(page-1)*TASK_PAGE_SIZE+tasks.length} matching tasks`:`Page ${page} · No tasks on this page`}</p>
        {page>1?<><Button asChild variant="outline" size="sm"><TaskLink href={taskPageHref(filters,1)}>First page</TaskLink></Button><Button asChild variant="outline" size="sm"><TaskLink href={taskPageHref(filters,page-1)}>Previous page</TaskLink></Button></>:null}
        {query.data.hasNext?<Button asChild variant="outline" size="sm"><TaskLink href={taskPageHref(filters,page+1)}>Next page</TaskLink></Button>:null}
        <Button variant="ghost" size="sm" disabled={query.isFetching||pending.length>0} onClick={()=>void query.refetch()}>Refresh tasks</Button>
      </nav><p className="text-xs text-muted-foreground">Date groups and task counts below include this page only.</p>
      {page>1&&tasks.length===0?<p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">This page has no matches. Use First page or Previous page to continue.</p>:<TaskBoard tasks={tasks} hasActiveFilters={hasFilters} todayISO={calendar.todayISO} subjects={subjects} pendingTaskIds={pending.map((value)=>value.task.id)} onCreateTask={(form)=>changeTask(createCachedTask,form)} onUpdateTask={(form)=>changeTask(updateCachedTask,form)} onDeleteTask={(form)=>changeTask(deleteCachedTask,form)} onSetTaskCompletion={async(form)=>{
        const id=String(form.get("task_id")??"")
        const task=query.data?.tasks.find((task)=>task.id===id)
        if(task)await saveCompletion({task,completed:form.get("completed")==="true",form})
      }}/>}</>:null}
  </div>
}
