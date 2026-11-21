export function getProfileDisplayName(user:{user_metadata?:Record<string,unknown>;email?:string}|undefined,profileName?:string|null){
  const metadata=user?.user_metadata??{}
  const fullName=typeof metadata.full_name==='string'?metadata.full_name:undefined
  const name=typeof metadata.name==='string'?metadata.name:undefined
  const candidate=profileName??fullName??name??user?.email?.split('@')[0]??'Student'
  return candidate.split(' ')[0]||'Student'
}
