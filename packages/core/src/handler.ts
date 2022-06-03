import { APIInteraction, InteractionType, InteractionResponseType } from 'discord-api-types/payloads/v10'
import { Router, Request as IttyRequest } from 'itty-router'
import { concatUint8Arrays, valueToUint8Array } from './utils'

export const router = Router()

export async function verify (req: Request & IttyRequest, env: any) {
  env.body = await req.text()
  const signature = req.headers.get('X-Signature-Ed25519')
  const timestamp = req.headers.get('X-Signature-Timestamp')
  if (!signature || !timestamp || !req.params?.token) {
    return new Response(
      'Missing signature, timestamp, or token',
      { status: 428, headers: { 'Content-Type': 'text/plain' } }
    )
  }
  if (signature.length !== 128 || req.params.token.length !== 64) {
    return new Response(
      'Invalid signature or token',
      { status: 403, headers: { 'Content-Type': 'text/plain' } }
    )
  }
  if (!await verifyKey(env.body, signature, timestamp, req.params.token)) {
    return new Response(
      'Signature mismatch',
      { status: 403, headers: { 'Content-Type': 'text/plain' } }
    )
  }
}

const verifyKey = async (body: string, sig: string, ts: string, token: string) => {
  const pubkey = valueToUint8Array(token, 'hex')
  const timestamp = valueToUint8Array(ts)
  const signature = valueToUint8Array(sig, 'hex')
  const data = valueToUint8Array(body)
  const hashbody = concatUint8Arrays(timestamp, data)

  const key = await crypto.subtle.importKey(
    'raw',
    pubkey,
    { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' },
    false,
    ['verify']
  )
  return await crypto.subtle.verify('NODE-ED25519', key, signature, hashbody)
}

router.post('/:token', verify, async (req, env) => {
  const body = JSON.parse(env.body) as APIInteraction
  console.log(body)
  if (body.type === InteractionType.Ping) {
    return new Response(
      JSON.stringify({ type: InteractionResponseType.Pong }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (Reflect.has(env, body.application_id)) {
    return new Response(
      'Preconditions passed, but no handler found',
      { status: 422, headers: { 'Content-Type': 'text/plain' } }
    )
  }
  const handler = env[body.application_id]
  return await handler.fetch(req)
})

router.all('*', () => Response.redirect('https://github.com/Dougley/zipzap'))
