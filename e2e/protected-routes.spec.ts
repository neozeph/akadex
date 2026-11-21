import { test,expect } from '@playwright/test'

test('spec10: anonymous protected routes and task API fail closed',async({browser})=>{
  const context=await browser.newContext(),page=await context.newPage()
  try{
    for(const route of ['dashboard','tasks','semesters','pomodoro','analytics','settings']){
      await page.goto(`/${route}`)
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByLabel('Email',{exact:true})).toBeVisible()
      await expect(page.getByLabel('Password',{exact:true})).toBeVisible()
      await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeEnabled()
    }
    const response=await page.request.get('/api/tasks')
    expect(response.status()).toBe(401)
    expect(response.headers()['cache-control']).toContain('no-store')
  }finally{await context.close()}
})
