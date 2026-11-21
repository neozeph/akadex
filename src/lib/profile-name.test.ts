import { expect,it } from 'vitest'
import { getProfileDisplayName } from './profile-name'

it('uses the saved profile first and retains consistent auth fallbacks when cleared',()=>{
  const user={email:'student@example.test',user_metadata:{full_name:'Old Name',name:'Fallback Name'}}
  expect(getProfileDisplayName(user,'New Name')).toBe('New')
  expect(getProfileDisplayName(user,null)).toBe('Old')
  expect(getProfileDisplayName({user_metadata:{name:'Fallback Name'}})).toBe('Fallback')
  expect(getProfileDisplayName({email:'student@example.test'})).toBe('student')
  expect(getProfileDisplayName(undefined)).toBe('Student')
})
