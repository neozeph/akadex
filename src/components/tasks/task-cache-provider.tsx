"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { makeTaskQueryClient } from "@/lib/task-cache"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { ToastProvider } from "@/components/ui/toast-provider"

let browser:{userId:string;client:QueryClient}|undefined
function getClient(userId:string){
  if(typeof window==="undefined")return makeTaskQueryClient()
  if(!browser || browser.userId!==userId){browser?.client.clear();browser={userId,client:makeTaskQueryClient()}}
  return browser.client
}
type AccountCache={userId:string;client:QueryClient;clear:()=>void;isCurrent:()=>boolean;sessionLost:()=>void;profileName:string|undefined;setProfileName:(name:string)=>void}
const Context=createContext<AccountCache|null>(null)
export function TaskCacheProvider({userId,children,taskRevision}:{userId:string;children:React.ReactNode;taskRevision:string}){
  const [client]=useState(()=>getClient(userId))
  const [blocked,setBlocked]=useState(false)
  const [profileName,setProfileName]=useState<string>()
  const active=useRef(true)
  const revision=useRef(taskRevision)
  useEffect(()=>{
    if(revision.current===taskRevision)return
    revision.current=taskRevision
    // Mutation handlers reconcile active task writes. Other views refetch on revisit.
    if(active.current)void client.invalidateQueries({queryKey:['tasks',userId],refetchType:'none'})
  },[client,userId,taskRevision])
  const clear=useCallback(()=>{active.current=false;setProfileName(undefined);setBlocked(true);client.clear()},[client])
  const sessionLost=useCallback(()=>{if(!active.current)return;clear();window.location.reload()},[clear])
  useEffect(()=>{
    active.current=true
    const {data}=createSupabaseBrowserClient().auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT" || (event==="INITIAL_SESSION" && !session) || (session && session.user.id!==userId))sessionLost()
    })
    return()=>{active.current=false;data.subscription.unsubscribe();client.clear()}
  },[client,userId,sessionLost])
  return <Context.Provider value={{userId,client,clear,isCurrent:()=>active.current,sessionLost,profileName,setProfileName}}><QueryClientProvider client={client}>{blocked?<p role="status" className="p-6 text-sm text-muted-foreground">Account session changed. Reloading...</p>:<ToastProvider>{children}</ToastProvider>}</QueryClientProvider></Context.Provider>
}
export function useTaskAccount(){const value=useContext(Context);if(!value)throw new Error("Authenticated task cache is unavailable");return value}
