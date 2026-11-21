import { assertLocalE2EEnvironment,E2E_APP_URL,E2E_SUPABASE_URL } from './environment.ts'

export const CI_AUTH_DIRECTORY='e2e/.cache/ci-auth'

export function assertDisposableCIAuth(env:Record<string,string|undefined>=process.env){
  if(env.CI!=='true'||env.AKADEX_CI_DISPOSABLE_AUTH!=='1')throw Error('Disposable CI login requires explicit authorization.')
  assertLocalE2EEnvironment(env.E2E_APP_URL??E2E_APP_URL,env.E2E_SUPABASE_URL??E2E_SUPABASE_URL)
}

export function authState(account:'a'|'b',env:Record<string,string|undefined>=process.env){
  if(env.AKADEX_CI_DISPOSABLE_AUTH==='1'){
    assertDisposableCIAuth(env)
    return `${CI_AUTH_DIRECTORY}/${account}.json`
  }
  return `e2e/.auth/${account}.json`
}
