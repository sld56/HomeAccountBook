# 클라이언트 컨테이너 — multi-stage build
# 1) node:22-alpine에서 Vite 프로덕션 빌드
# 2) nginx:alpine에서 dist/ 정적 호스팅 + Supabase API 리버스 프록시
# 빌드 인자: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (docker-compose의 build.args로 주입)

############ Build stage ############
FROM node:22-alpine AS build

WORKDIR /app

# 의존성 캐시 활용을 위해 package*.json만 먼저 복사
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사
COPY index.html tsconfig*.json vite.config.ts ./
COPY public ./public
COPY src ./src

# Vite 빌드 인자 — 둘 다 클라이언트 번들에 박혀 공개되는 값.
# anon key는 Supabase 설계상 공개되도 안전하며, 격리는 RLS가 강제함.
# (Docker linter의 "SecretsUsedInArgOrEnv" 경고는 이 컨텍스트에서는 의도된 동작)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

RUN npm run build

############ Runtime stage ############
FROM nginx:alpine AS runtime

# 기본 nginx 설정 교체
RUN rm /etc/nginx/conf.d/default.conf
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 산출물
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# 헬스체크 (cloudflared가 컨테이너 가동을 모르는 경우 대비)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
