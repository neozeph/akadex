import 'server-only'
import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// An opaque invalidation hint, never identity, authorization, or protected data.
export async function revalidateTaskViews(){
  const store=await cookies()
  store.set('akadex-task-revision',randomUUID(),{
    httpOnly:true,sameSite:'lax',path:'/',secure:process.env.NODE_ENV==='production' && process.env.AKADEX_E2E!=='1',
  })
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  revalidatePath('/semesters/[semesterId]','page')
  revalidatePath('/semesters/[semesterId]/subjects/[subjectId]','page')
  revalidatePath('/analytics')
}
