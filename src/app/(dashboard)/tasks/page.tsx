import { headers } from "next/headers"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { TaskWorkspace } from "@/components/tasks/task-workspace"
import { makeTaskQueryClient, taskQueryKey } from "@/lib/task-cache"
import { getTaskPlannerData, type TasksSearchParams } from "./data"

export default async function TasksPage({searchParams}:{searchParams:Promise<TasksSearchParams>}) {
  // Fetch metadata selects only the prefetch strategy, never authorization.
  const documentRequest=(await headers()).get("sec-fetch-dest")!=="empty"
  const data=await getTaskPlannerData(await searchParams,documentRequest)
  let state
  if(data.taskPage){
    const client=makeTaskQueryClient()
    client.setQueryData(taskQueryKey(data.userId,data.filters,data.page),data.taskPage)
    state=dehydrate(client)
  }
  return <HydrationBoundary state={state}><TaskWorkspace subjects={data.subjects} todayISO={data.todayISO} timeZone={data.timeZone}/></HydrationBoundary>
}
