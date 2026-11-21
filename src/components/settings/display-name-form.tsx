"use client"

import { useState } from 'react'
import { useTaskAccount } from '@/components/tasks/task-cache-provider'

export function DisplayNameForm({children,onSave}:{children:React.ReactNode;onSave:(form:FormData)=>Promise<{accountChanged:true}|{accountChanged:false;userId:string;displayName:string}>}){
  const account=useTaskAccount()
  const [pending,setPending]=useState(false)
  const [message,setMessage]=useState('')
  const [failed,setFailed]=useState(false)
  return <form className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm" onSubmit={async event=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setMessage('');setFailed(false);setPending(true)
    try{
      const result=await onSave(form)
      if(!account.isCurrent())return
      if(result.accountChanged){account.sessionLost();return}
      if(result.userId!==account.userId){account.sessionLost();return}
      account.setProfileName(result.displayName)
      setMessage('Display name saved.')
    }
    catch{setFailed(true);setMessage('Unable to save your display name. Please try again.')}
    finally{setPending(false)}
  }}>
    <fieldset disabled={pending} className="space-y-4">{children}</fieldset>
    {pending?<p role="status" className="text-sm text-muted-foreground">Saving display name...</p>:null}
    {message?<p role={failed?'alert':'status'} className={failed?'text-sm text-destructive':'text-sm text-muted-foreground'}>{message}</p>:null}
  </form>
}
