import { router } from '../src/handler'
import makeServiceWorkerEnv from 'service-worker-mock'

declare let global: any

describe('handle', () => {
  beforeEach(() => {
    Object.assign(global, makeServiceWorkerEnv())
    jest.resetModules()
  })

  test('handle GET', async () => {
    const result = await router.handle(new Request('/test/test2', { method: 'POST' }), makeServiceWorkerEnv())
    expect(result.status).toEqual(200)
    const text = await result.text()
    expect(text).toEqual('request method: GET')
  })
})
