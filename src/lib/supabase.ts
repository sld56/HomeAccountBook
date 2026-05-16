import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — running in local-only mode',
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
  if (error) throw error;
  return data as T;
}
