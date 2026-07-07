import { getCorsHeaders, createCorsPreflightResponse } from '../lib/cors'
import { verifySupabaseUser } from '../lib/auth'
import { errors } from '../lib/errors'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

// 6-char code charset (no ambiguous chars: 0/O, 1/I/L)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => CHARSET[b % CHARSET.length]).join('')
}

function supabaseHeaders(serviceKey: string) {
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
}

// GET /api/referral?user_id=UUID  → get or create referral code
// GET /api/referral?code=CODE     → validate code exists
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    const url = new URL(context.request.url)
    const headers = supabaseHeaders(context.env.SUPABASE_SERVICE_KEY)

    // --- Validate code mode ---
    const codeParam = url.searchParams.get('code')
    if (codeParam) {
      const rpcRes = await fetch(
        `${context.env.SUPABASE_URL}/rest/v1/rpc/validate_referral_code`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ p_code: codeParam }),
        }
      )

      if (rpcRes.ok) {
        const valid = await rpcRes.json()
        return new Response(JSON.stringify({ valid }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      // Fallback: direct table lookup if RPC not deployed yet
      const fallbackRes = await fetch(
        `${context.env.SUPABASE_URL}/rest/v1/referral_codes?code=eq.${encodeURIComponent(codeParam)}&select=code`,
        { headers }
      )
      const rows = fallbackRes.ok ? await fallbackRes.json() as Array<{ code: string }> : []
      return new Response(JSON.stringify({ valid: rows.length > 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // --- Get/create code mode ---
    const userId = url.searchParams.get('user_id')
    if (!userId) {
      return errors.validation('user_id or code parameter is required', corsHeaders)
    }

    // Check existing code
    const existingRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/referral_codes?user_id=eq.${userId}&select=code,total_referrals,available_credits`,
      { headers }
    )

    if (existingRes.ok) {
      const rows = await existingRes.json() as Array<{ code: string; total_referrals: number; available_credits: number }>
      if (rows.length > 0) {
        const row = rows[0]
        return new Response(JSON.stringify({
          code: row.code,
          referral_url: `https://kstylist.cc/?ref=${row.code}`,
          total_referrals: row.total_referrals,
          available_credits: row.available_credits,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    // Create new code with collision retry
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateCode()
      const insertRes = await fetch(
        `${context.env.SUPABASE_URL}/rest/v1/referral_codes`,
        {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify({ user_id: userId, code }),
        }
      )

      if (insertRes.ok) {
        return new Response(JSON.stringify({
          code,
          referral_url: `https://kstylist.cc/?ref=${code}`,
          total_referrals: 0,
          available_credits: 0,
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      // If conflict (duplicate code), retry
      const errText = await insertRes.text()
      if (!errText.includes('duplicate') && !errText.includes('unique')) {
        console.error('[referral] Insert error:', errText)
        return errors.externalApi('Supabase', corsHeaders)
      }
    }

    return errors.internal(corsHeaders)
  } catch (error) {
    console.error('[referral] GET Error:', error)
    return errors.internal(corsHeaders)
  }
}

// POST /api/referral — use credit OR record conversion
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = getCorsHeaders(context.request)

  try {
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY) {
      return errors.configError(corsHeaders)
    }

    let body: Record<string, string>
    try {
      body = await context.request.json() as Record<string, string>
    } catch {
      return errors.invalidRequest('Invalid JSON body', corsHeaders)
    }

    const headers = supabaseHeaders(context.env.SUPABASE_SERVICE_KEY)

    // ===== Action: use_credit (atomic via RPC) =====
    if (body.action === 'use_credit') {
      // Credits are money — identity must come from the verified session,
      // or anyone could drain another user's credits by guessing their UUID
      const verified = await verifySupabaseUser(context.request, context.env)
      if (!verified) {
        return errors.unauthorized(corsHeaders)
      }
      const userId = verified.id

      // Call atomic RPC function
      const rpcRes = await fetch(
        `${context.env.SUPABASE_URL}/rest/v1/rpc/use_referral_credit`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ p_user_id: userId }),
        }
      )

      if (rpcRes.ok) {
        const remaining = await rpcRes.json() as number
        if (remaining === -1) {
          return new Response(JSON.stringify({ success: false, error: 'No credits available' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
        return new Response(JSON.stringify({ success: true, credits_remaining: remaining }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      console.error('[referral] RPC use_referral_credit error:', await rpcRes.text())
      return errors.externalApi('Supabase', corsHeaders)
    }

    // ===== Action: record referral conversion =====
    const { referral_code, referred_email, purchase_type, checkout_id } = body
    if (!referral_code || !referred_email || !purchase_type) {
      return errors.validation('referral_code, referred_email, and purchase_type are required', corsHeaders)
    }

    // Look up referrer
    const codeRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/referral_codes?code=eq.${encodeURIComponent(referral_code)}&select=user_id`,
      { headers }
    )
    if (!codeRes.ok) {
      return errors.externalApi('Supabase', corsHeaders)
    }

    const codeRows = await codeRes.json() as Array<{ user_id: string }>
    if (codeRows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid referral code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const referrerUserId = codeRows[0].user_id

    // Self-referral prevention
    if (body.referred_user_id && body.referred_user_id === referrerUserId) {
      return new Response(JSON.stringify({ success: false, error: 'Self-referral not allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Insert referral event (unique index prevents duplicates)
    const eventRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/referral_events`,
      {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          referrer_user_id: referrerUserId,
          referred_email,
          referral_code,
          purchase_type,
          checkout_id: checkout_id || null,
        }),
      }
    )

    if (!eventRes.ok) {
      const errText = await eventRes.text()
      if (errText.includes('duplicate') || errText.includes('unique')) {
        return new Response(JSON.stringify({ success: false, error: 'Referral already recorded' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      console.error('[referral] Event insert error:', errText)
      return errors.externalApi('Supabase', corsHeaders)
    }

    // Atomic increment referrer's stats via RPC
    await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/rpc/record_referral_credit`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_code: referral_code }),
      }
    )

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error) {
    console.error('[referral] POST Error:', error)
    return errors.internal(corsHeaders)
  }
}

export const onRequestOptions: PagesFunction = async (context) => {
  return createCorsPreflightResponse(context.request)
}
