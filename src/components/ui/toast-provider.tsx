"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { Toast } from "radix-ui"
import { X } from "lucide-react"

type Notice={id:number;message:string;error:boolean}
const Context=createContext<((message:string,error?:boolean)=>void)|null>(null)

export function ToastProvider({children}:{children:React.ReactNode}){
  const [notices,setNotices]=useState<Notice[]>([])
  const nextId=useRef(0)
  const notify=useCallback((message:string,error=false)=>{
    const id=++nextId.current
    setNotices(current=>[...current.slice(-2),{id,message,error}])
  },[])
  return <Context.Provider value={notify}><Toast.Provider duration={5000} swipeDirection="right">
    {children}
    {notices.map(notice=><Toast.Root key={notice.id} type={notice.error?"foreground":"background"}
      onOpenChange={open=>{if(!open)setNotices(current=>current.filter(item=>item.id!==notice.id))}}
      className={`flex items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-lg ${notice.error?"border-destructive/50":"border-border"}`}>
      <Toast.Title className="flex-1 text-sm font-medium">{notice.message}</Toast.Title>
      <Toast.Close aria-label="Dismiss notification" className="rounded-md p-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" aria-hidden="true"/></Toast.Close>
    </Toast.Root>)}
    <Toast.Viewport label="Notifications" className="fixed right-4 bottom-24 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none lg:bottom-4"/>
  </Toast.Provider></Context.Provider>
}

export function useToast(){
  const notify=useContext(Context)
  if(!notify)throw new Error("Toast provider is unavailable")
  return notify
}
