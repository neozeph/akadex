import { expect,it } from 'vitest'
import { assertDisposableCIAuth,authState } from './ci-auth'

it('requires explicit authorization and exact local targets before unattended auth',()=>{
  for(const env of [{},{CI:'true'},{AKADEX_CI_DISPOSABLE_AUTH:'1'},{CI:'true',AKADEX_CI_DISPOSABLE_AUTH:'0'}])expect(()=>assertDisposableCIAuth(env)).toThrow()
  const allowed={CI:'true',AKADEX_CI_DISPOSABLE_AUTH:'1'}
  expect(()=>assertDisposableCIAuth(allowed)).not.toThrow()
  expect(()=>assertDisposableCIAuth({...allowed,E2E_APP_URL:'https://example.com'})).toThrow()
  expect(()=>assertDisposableCIAuth({...allowed,E2E_SUPABASE_URL:'https://example.supabase.co'})).toThrow()
  expect(authState('a',{})).toBe('e2e/.auth/a.json')
  expect(authState('b',allowed)).toBe('e2e/.cache/ci-auth/b.json')
})
