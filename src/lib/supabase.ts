import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// URL과 KEY는 함께 설정해야 함. 한쪽만 있으면 설정 실수 — 빌드 시 명시적 경고.
if (!url && !anonKey) {
  console.info('[supabase] 환경 변수 미설정 — 로컬 전용 모드로 실행');
} else if (!url || !anonKey) {
  console.error(
    '[supabase] VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY는 함께 설정해야 합니다. ' +
      `URL=${Boolean(url)}, ANON_KEY=${Boolean(anonKey)}. 로컬 전용 모드로 폴백합니다.`,
  );
}

// Database 제네릭은 supabase CLI로 생성한 타입으로 교체 예정 (M5 배포 시):
//   npx supabase gen types typescript --local > src/types/supabase.ts
// 현재는 untyped 클라이언트로 사용하고 호출부에서 좁힌다.
export const supabase = createClient(
  url ?? 'http://localhost:8000',
  anonKey ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
);

export const isServerConfigured = Boolean(url && anonKey);

export async function callFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown> | null,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? undefined,
  });
  if (error) {
    // supabase-js의 FunctionsHttpError는 응답 body를 직접 노출하지 않음.
    // context.response가 있으면 거기서 JSON.error 필드 추출해 사용자 친화적 메시지로.
    const ctx = (error as { context?: { response?: Response } }).context;
    const resp = ctx?.response;
    if (resp) {
      try {
        const cloned = resp.clone();
        const json = await cloned.json();
        if (json && typeof json.error === 'string' && json.error) {
          throw new Error(json.error);
        }
      } catch (innerErr) {
        if (innerErr instanceof Error && innerErr.message && innerErr.message !== error.message) {
          throw innerErr;
        }
      }
    }
    throw error;
  }
  return data as T;
}
