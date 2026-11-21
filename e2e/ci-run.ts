import { chromium } from '@playwright/test'
import { randomUUID,randomBytes } from 'node:crypto'
import { mkdir,writeFile,readFile,unlink,chmod } from 'node:fs/promises'
import { spawn,type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import { assertDisposableCIAuth,authState,CI_AUTH_DIRECTORY } from './ci-auth.ts'
import { E2E_APP_URL,E2E_SUPABASE_URL } from './environment.ts'
import { localRuntime } from './runtime.ts'
import { localSQL } from './migrations.ts'
import { stopProcessTree } from './process.ts'

const manifest=`${CI_AUTH_DIRECTORY}/run.json`
const summary='e2e/.cache/ci-summary.json'

async function cleanup(){
  localRuntime() // Never delete users from an unverified/hosted database.
  let run:string
  try{run=JSON.parse(await readFile(manifest,'utf8')).run}catch(error){
    if((error as NodeJS.ErrnoException).code==='ENOENT')return
    throw Error('CI cleanup manifest is invalid.')
  }
  if(!/^[a-f0-9-]{36}$/.test(run))throw Error('CI cleanup scope is invalid.')
  localSQL(`DELETE FROM auth.users WHERE email IN ('akadex-ci-${run}-a@example.test','akadex-ci-${run}-b@example.test')`)
  for(const file of [authState('a'),authState('b'),manifest]){
    try{await unlink(file)}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
  }
}

async function main(){
  assertDisposableCIAuth() // No browser, credentials or network auth before this gate.
  if(process.argv[2]==='cleanup'){await cleanup();console.info('Disposable CI auth cleanup completed.');return}
  const {env}=localRuntime()
  process.env.PLAYWRIGHT_NO_COPY_PROMPT='1'
  await mkdir(CI_AUTH_DIRECTORY,{recursive:true})
  const run=randomUUID()
  await writeFile(manifest,JSON.stringify({run}),{flag:'wx',mode:0o600})
  let server:ChildProcess|undefined,child:ChildProcess|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined
  let stage='start',passed=false,cleaned=false,accounts=0
  let cancelled=false,releasing:Promise<void>|undefined
  const execute=(args:string[])=>new Promise<void>((done,reject)=>{
    if(cancelled){reject(Error('CI run interrupted.'));return}
    child=spawn(process.execPath,args,{env,detached:process.platform!=='win32',stdio:'inherit'})
    child.once('error',()=>reject(Error('CI child failed.')))
    child.once('exit',code=>code===0?done():reject(Error('CI child failed.')))
  })
  function release(){
    return releasing??=(async()=>{
      const stopped=await Promise.allSettled([browser?.close(),child?stopProcessTree(child):Promise.resolve(),server?stopProcessTree(server):Promise.resolve()])
      browser=undefined
      await cleanup()
      cleaned=stopped.every(result=>result.status==='fulfilled')
    })()
  }
  const interrupted=()=>{cancelled=true;void release().catch(()=>{}).finally(()=>{process.exit(1)})}
  process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted)
  try{
    // Refuse to attach to an app started by someone else.
    let occupied=false
    try{await fetch(`${E2E_APP_URL}/login`);occupied=true}catch{/* Expected when port is free. */}
    if(occupied||cancelled)throw Error('Test port is occupied or run interrupted.')
    server=spawn(process.execPath,[resolve('e2e/run.ts'),'serve'],{env,detached:process.platform!=='win32',stdio:'inherit'})
    const deadline=Date.now()+180000
    let ready=false
    while(Date.now()<deadline&&server.exitCode===null){
      try{ready=(await fetch(`${E2E_APP_URL}/login`)).ok}catch{/* Wait for owned server. */}
      if(ready)break
      await new Promise(done=>setTimeout(done,250))
    }
    if(!ready)throw Error('Owned app did not start.')
    browser=await chromium.launch()
    for(const account of ['a','b'] as const){
      const context=await browser.newContext({viewport:{width:1280,height:900}})
      // Only loopback app/API requests can carry these generated credentials.
      await context.route('**/*',route=>[E2E_APP_URL,E2E_SUPABASE_URL].includes(new URL(route.request().url()).origin)?route.continue():route.abort())
      const page=await context.newPage(),email=`akadex-ci-${run}-${account}@example.test`,password=`Aa1!${randomBytes(24).toString('hex')}`
      stage='registration'
      await page.goto(`${E2E_APP_URL}/register`)
      if(new URL(page.url()).origin!==E2E_APP_URL)throw Error('Unexpected registration destination.')
      await page.getByLabel('Full name',{exact:true}).fill(`CI Student ${account.toUpperCase()}`)
      await page.getByLabel('Email',{exact:true}).fill(email)
      await page.getByLabel('Password',{exact:true}).fill(password)
      await page.getByRole('button',{name:'Create account',exact:true}).click()
      await page.waitForURL(`${E2E_APP_URL}/dashboard`,{timeout:30000})
      await page.getByRole('button',{name:'Sign out',exact:true}).click()
      await page.waitForURL(`${E2E_APP_URL}/login`,{timeout:30000})
      await page.goto(`${E2E_APP_URL}/dashboard`)
      await page.waitForURL(`${E2E_APP_URL}/login`,{timeout:30000})
      stage='login'
      if(new URL(page.url()).origin!==E2E_APP_URL)throw Error('Unexpected login destination.')
      await page.getByLabel('Email',{exact:true}).fill(email)
      await page.getByLabel('Password',{exact:true}).fill(password)
      await page.getByRole('button',{name:'Sign in',exact:true}).click()
      await page.waitForURL(`${E2E_APP_URL}/dashboard`,{timeout:30000})
      await page.getByRole('heading',{level:1}).waitFor()
      await context.storageState({path:authState(account)});await chmod(authState(account),0o600)
      accounts++;await context.close()
    }
    await browser.close();browser=undefined
    await stopProcessTree(server);server=undefined
    stage='regressions'
    await execute([resolve('e2e/run.ts'),'test'])
    passed=true
  }catch{
    // Never serialize Playwright errors: fill call logs can contain credentials.
    console.error(`Disposable local CI check failed during ${stage}. Private diagnostics omitted.`)
  }finally{
    try{await release()}catch{console.error('Disposable CI cleanup needs attention.');cleaned=false}
    process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted)
    await writeFile(summary,JSON.stringify({version:1,passed,stage,authenticatedAccounts:accounts,cleanup:cleaned})+'\n')
  }
  if(!passed||!cleaned)process.exitCode=1
}

main().catch(()=>{console.error('CI runner refused to start. Check explicit authorization, local services and private cleanup manifest.');process.exitCode=1})
