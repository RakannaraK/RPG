/* global Deno */
// Fase 67 — credenciais TURN temporárias (Cloudflare Realtime TURN) para a chamada.
// Segredos: CF_TURN_KEY_ID e CF_TURN_TOKEN. A chave da Cloudflare nunca sai daqui.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const resp = (corpo, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resp({ erro: 'metodo' }, 405)

  const keyId = Deno.env.get('CF_TURN_KEY_ID')
  const token = Deno.env.get('CF_TURN_TOKEN')
  if (!keyId || !token) return resp({ erro: 'turn_nao_configurado' }, 501)

  let mesaId
  try { ({ mesaId } = await req.json()) } catch { return resp({ erro: 'corpo_invalido' }, 400) }
  if (typeof mesaId !== 'string' || !UUID.test(mesaId)) return resp({ erro: 'mesa_invalida' }, 400)

  // mesma função que protege o canal da chamada (F65)
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data, error } = await supabase.rpc('posso_entrar_na_chamada', { p_topico: 'chamada:' + mesaId })
  if (error || data !== true) return resp({ erro: 'sem_permissao' }, 403)

  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 43200 }),
    })
    if (!r.ok) return resp({ erro: 'cloudflare' }, 502)
    const j = await r.json()
    // a porta 53 dá timeout em navegador (aviso da documentação)
    const iceServers = (Array.isArray(j.iceServers) ? j.iceServers : [])
      .map(s => ({ ...s, urls: [].concat(s.urls ?? []).filter(u => !/:53(\?|$)/.test(u)) }))
      .filter(s => s.urls.length)
    return resp({ iceServers })
  } catch {
    return resp({ erro: 'cloudflare' }, 502)
  }
})
