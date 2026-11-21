import { expect,it,vi } from 'vitest'
const {set,path}=vi.hoisted(()=>({set:vi.fn(),path:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('next/headers',()=>({cookies:async()=>({set})}))
vi.mock('next/cache',()=>({revalidatePath:path}))
import { revalidateTaskViews } from './mutation-cache'

it('marks task-dependent server views and a fresh browser revision without account data',async()=>{
  await revalidateTaskViews()
  expect(path.mock.calls).toEqual([['/tasks'],['/dashboard'],['/semesters/[semesterId]','page'],['/semesters/[semesterId]/subjects/[subjectId]','page'],['/analytics']])
  const first=set.mock.calls[0]
  expect(first[0]).toBe('akadex-task-revision')
  expect(first[1]).toMatch(/^[a-f0-9-]{36}$/)
  expect(first[2]).toMatchObject({httpOnly:true,sameSite:'lax',path:'/'})
  await revalidateTaskViews();expect(set.mock.calls[1][1]).not.toBe(first[1])
})
