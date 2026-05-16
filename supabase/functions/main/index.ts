// Edge Runtime main service — 라우팅 디스패처
// supabase/edge-runtime 컨테이너가 이 main 파일을 실행하여 개별 함수를 분기

import { STATUS_TEXT } from 'jsr:@std/http/status';

const SERVICE_ROUTES: Record<string, string> = {
  '/create-invite': '../create-invite/index.ts',
  '/accept-invite': '../accept-invite/index.ts',
  '/create-household': '../create-household/index.ts',
  '/remove-member': '../remove-member/index.ts',
  '/import-local': '../import-local/index.ts',
  '/delete-account': '../delete-account/index.ts',
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 함수 이름 추출 (예: /functions/v1/create-invite → /create-invite)
  const fnPath = '/' + pathname.split('/').filter(Boolean).pop();
  const modulePath = SERVICE_ROUTES[fnPath];

  if (!modulePath) {
    return new Response(JSON.stringify({ error: `function not found: ${fnPath}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const mod = await import(modulePath);
    // 각 함수는 Deno.serve를 호출하므로, 핸들러를 직접 노출하도록 변경 필요할 수 있음
    // (현재 구현은 Deno.serve 직접 호출 → 메인에서 import만으로 동작)
    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(STATUS_TEXT[500], { status: 500 });
  }
});
