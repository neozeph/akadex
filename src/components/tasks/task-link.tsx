"use client"

export function TaskLink({href,children}:{href:string;children:React.ReactNode}) {
  return <a href={href} onClick={(event)=>{
    if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return
    event.preventDefault();window.history.pushState(null,"",href)
  }}>{children}</a>
}
