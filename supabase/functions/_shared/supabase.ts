// Edge Function 공용: 인증된 클라이언트와 서비스 키 클라이언트 생성
// Deno 런타임

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function getAuthedClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new HttpError(401, 'Missing Authorization header');
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handle(
  req: Request,
  fn: (req: Request) => Promise<Response>,
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }
  try {
    const res = await fn(req);
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error(`[error] ${status} ${message}`);
    return json({ error: message }, status);
  }
}

export async function getCurrentUser(req: Request): Promise<{ id: string; email?: string }> {
  const client = getAuthedClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'Not authenticated');
  return { id: data.user.id, email: data.user.email };
}

export async function audit(opts: {
  household_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_table?: string;
  target_id?: string;
  diff?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  const service = getServiceClient();
  const ip = opts.req?.headers.get('cf-connecting-ip') ?? opts.req?.headers.get('x-forwarded-for');
  let ipHash: Uint8Array | null = null;
  if (ip) {
    const salt = new Date().toISOString().slice(0, 10);
    const data = new TextEncoder().encode(ip + salt);
    const buf = await crypto.subtle.digest('SHA-256', data);
    ipHash = new Uint8Array(buf);
  }
  await service.from('audit_log').insert({
    household_id: opts.household_id,
    actor_user_id: opts.actor_user_id,
    action: opts.action,
    target_table: opts.target_table,
    target_id: opts.target_id,
    diff: opts.diff ?? null,
    ip_hash: ipHash,
    user_agent: opts.req?.headers.get('user-agent')?.slice(0, 200),
  });
}
