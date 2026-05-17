#!/usr/bin/env node
// 사용법: node infra/scripts/gen-keys.mjs
//
// 1) JWT_SECRET을 생성
// 2) JWT_SECRET으로 서명한 anon / service_role JWT 생성
// 3) .env에 붙여 넣을 형태로 출력
//
// 외부 의존성 없이 Node 22의 내장 crypto만 사용.

import { randomBytes, createHmac, createPublicKey } from 'node:crypto';
import process from 'node:process';

function b64url(input) {
  const buf = input instanceof Buffer ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const body = `${h}.${p}`;
  const sig = createHmac('sha256', secret).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

// 1. JWT_SECRET — 32 bytes hex (= 64 chars)
const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');

// 2. Postgres password — hex로 생성해 URL-safe 보장 (+/= 같은 특수문자 없음)
// 이전: base64 사용 → +/= 가 GOTRUE_DB_DATABASE_URL의 password 부분에서
// URL 파싱을 깨뜨려 gotrue 패닉 (URL.Query() nil pointer)
const pgPassword = process.env.POSTGRES_PASSWORD || randomBytes(24).toString('hex');

// 3. Realtime secret
const realtimeSecret = process.env.REALTIME_SECRET || randomBytes(32).toString('hex');

// 4. anon + service_role JWT — 만료는 10년 (자체 호스팅 가족용)
const now = Math.floor(Date.now() / 1000);
const exp = now + 10 * 365 * 24 * 60 * 60;

const anonKey = sign(
  { iss: 'supabase', role: 'anon', iat: now, exp },
  jwtSecret,
);
const serviceKey = sign(
  { iss: 'supabase', role: 'service_role', iat: now, exp },
  jwtSecret,
);

console.log(`
# === 아래 값을 infra/.env에 복사하세요 ===

JWT_SECRET=${jwtSecret}
POSTGRES_PASSWORD=${pgPassword}
REALTIME_SECRET=${realtimeSecret}

ANON_KEY=${anonKey}
SERVICE_ROLE_KEY=${serviceKey}

# 만료: ${new Date(exp * 1000).toISOString()} (10년)
# JWT_SECRET을 바꾸면 ANON_KEY/SERVICE_ROLE_KEY도 같이 바꿔야 합니다.
`);
