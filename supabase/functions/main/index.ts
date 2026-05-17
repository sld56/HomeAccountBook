// Edge Runtime 메인 디스패처
// supabase/edge-runtime 컨테이너가 이 main을 실행하고, 들어오는 요청을
// 경로에서 추출한 함수 이름으로 라우팅해 EdgeRuntime.userWorkers로 위임.
//
// 참고: https://supabase.com/docs/guides/functions/development#self-hosting

console.log('main edge function started');

declare const EdgeRuntime: {
  userWorkers: {
    create(options: {
      servicePath: string;
      memoryLimitMb?: number;
      workerTimeoutMs?: number;
      noModuleCache?: boolean;
      importMapPath?: string | null;
      envVars?: [string, string][];
    }): Promise<{ fetch(req: Request, init?: { signal?: AbortSignal }): Promise<Response> }>;
  };
};

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter((p) => p);
  // kong이 /functions/v1/ 접두어를 strip하므로 parts[0]가 함수 이름
  const service_name = parts[0];

  if (!service_name) {
    return new Response(
      JSON.stringify({ error: 'missing function name in request path' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const servicePath = `/home/deno/functions/${service_name}`;

  try {
    const envVarsObj = Deno.env.toObject();
    const envVars: [string, string][] = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]);

    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb: 150,
      workerTimeoutMs: 5 * 60 * 1000,
      noModuleCache: false,
      importMapPath: null,
      envVars,
    });

    return await worker.fetch(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`worker failed for ${servicePath}:`, msg);
    return new Response(
      JSON.stringify({ error: msg, service: service_name }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
