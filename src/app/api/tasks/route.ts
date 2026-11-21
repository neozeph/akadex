import { cookies } from "next/headers"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { parseTaskQuery, type TasksSearchParams } from "@/lib/task-query"
import { queryTaskPage } from "@/lib/task-query-server"
import { getUserTimeZone } from "@/lib/user-timezone"
import { toDateInTimeZone } from "@/lib/dates"

export async function GET(request:Request) {
  const headers={"Cache-Control":"private, no-store"}
  const user=await getAuthenticatedUser()
  if(!user)return Response.json({error:"Unauthorized"},{status:401,headers})
  const expected=request.headers.get("x-akadex-account")
  if(expected && expected!==user.id)return Response.json({error:"Account changed"},{status:409,headers})
  const params=new URL(request.url).searchParams
  const input:TasksSearchParams={}
  for(const key of ["q","status","subject","priority","page"] as const){const values=params.getAll(key);input[key]=values.length>1?values:values[0]}
  const {filters,page}=parseTaskQuery(input)
  try{
    const cookieStore=await cookies()
    const supabase=createSupabaseServerClient({getAll:()=>cookieStore.getAll()})
    const [data,timeZone]=await Promise.all([queryTaskPage(supabase,filters,page,request.signal),getUserTimeZone(user.id)])
    return Response.json({userId:user.id,...data,timeZone,todayISO:toDateInTimeZone(new Date(),timeZone)},{headers})
  }catch{return Response.json({error:"Unable to load your tasks right now."},{status:500,headers})}
}
