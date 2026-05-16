# 미니 PC 셋업 가이드

> 우리집 가계부 서버 (Supabase OSS + Cloudflare Tunnel) 배포 순서
> 호스트 OS: Ubuntu Server 24.04 LTS 권장
> 사양서: [docs/05-서버-보안-기획.md](../docs/05-서버-보안-기획.md)

---

## 0. 사전 준비물 체크리스트

- [ ] 미니 PC (4GB RAM 이상, x86_64)
- [ ] Ubuntu Server 24.04 LTS 설치 (또는 동급 Debian 계열)
- [ ] 개인 도메인 1개 (예: `yourdomain.com`) — Cloudflare에 네임서버 위임
- [ ] Cloudflare 계정 (무료)
- [ ] Resend 계정 (무료, 메일 발송용)
- [ ] Backblaze B2 계정 (선택, 오프사이트 백업용)
- [ ] Tailscale 계정 (선택, SSH 접근용)

---

## 1. 호스트 OS 보안 기본 설정 (M5.0)

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 자동 보안 업데이트
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# 방화벽 (Tailscale 사용 시: inbound 모두 차단)
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
# Tailscale 미사용 시:
#   sudo ufw allow from <집_LAN>/24 to any port 22

# fail2ban
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban

# Docker (rootless 권장이지만 단순화를 위해 일반 모드)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose 플러그인 확인
docker compose version

# Tailscale (옵션이지만 강력 권장)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# 출력된 URL로 가서 인증 → SSH는 이 사설 IP로만 접근

# SSH 강화 (Tailscale 사용 시)
sudo nano /etc/ssh/sshd_config
#   PasswordAuthentication no
#   PermitRootLogin no
#   PubkeyAuthentication yes
sudo systemctl restart sshd
```

---

## 2. Cloudflare Tunnel 셋업 (M5.1)

### 2.1 Cloudflared 설치

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

### 2.2 터널 생성 및 인증

```bash
# 브라우저로 Cloudflare 로그인 (한 번만)
cloudflared tunnel login

# 터널 생성 → ~/.cloudflared/<UUID>.json 파일 생성됨
cloudflared tunnel create gagyebu

# DNS 자동 등록 (yourdomain.com이 Cloudflare 네임서버 사용 중이어야 함)
cloudflared tunnel route dns gagyebu gagyebu.yourdomain.com
cloudflared tunnel route dns gagyebu studio.gagyebu.yourdomain.com   # 옵션: Tailscale로 대체 가능
```

### 2.3 설정 파일

`~/.cloudflared/config.yml`:

```yaml
tunnel: gagyebu
credentials-file: /home/<USER>/.cloudflared/<UUID>.json
ingress:
  - hostname: gagyebu.yourdomain.com
    service: http://localhost:8080           # nginx (web 컨테이너) — 정적 + Supabase API 프록시
  - service: http_status:404
```

> 단일 도메인 구조: 웹 컨테이너의 nginx가 `/` → SPA, `/auth/v1`·`/rest/v1`·`/realtime/v1`·`/functions/v1` → 내부 kong으로 분기합니다. 별도 API 도메인 불필요.

### 2.4 시스템 서비스로 등록

```bash
sudo cloudflared service install
sudo systemctl status cloudflared
```

---

## 3. Supabase OSS 배포 (M5.1)

### 3.1 저장소 클론 및 환경변수

```bash
git clone https://github.com/<your-repo>/woorijip-gagyebu.git
cd woorijip-gagyebu/infra

# .env 작성 (절대 git에 커밋 금지)
cp .env.example .env
chmod 600 .env
nano .env
```

`.env`에 채워야 할 값:
- `POSTGRES_PASSWORD`: 강력한 비밀번호 (32자 이상 권장)
- `JWT_SECRET`: 32바이트 이상 랜덤 — `openssl rand -hex 32`
- `ANON_KEY` / `SERVICE_ROLE_KEY`: [supabase JWT generator](https://supabase.com/docs/guides/self-hosting/docker#api-keys) 또는 `npm run keys` 스크립트로 생성
- `SITE_URL`: `https://gagyebu.yourdomain.com`
- `SMTP_*`: Resend 발급 후 입력 (3.3 참조)

### 3.2 스택 기동

```bash
# 첫 빌드는 클라이언트 컨테이너까지 함께 빌드되어 5~10분 소요
docker compose up -d --build
docker compose ps     # web 포함 모든 컨테이너 healthy 확인
docker compose logs -f gotrue   # auth 로그 확인 (Ctrl+C로 종료)
```

`.env` 값이 바뀌면 (특히 `SITE_URL`, `ANON_KEY`) 클라이언트는 다시 빌드해야 합니다:
```bash
docker compose up -d --build web
```

### 3.3 Resend 도메인 검증 (메일 발송)

1. [resend.com](https://resend.com) 가입
2. **Domains** → "Add Domain" → `yourdomain.com` 입력
3. 표시되는 DNS 레코드(SPF/DKIM/MX)를 Cloudflare DNS에 추가
4. **API Keys** → "Create API Key" → 권한: Sending → 키 복사 → `.env`의 `SMTP_PASSWORD`에 입력
5. `.env`에서:
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASSWORD=<your-resend-api-key>
   SMTP_ADMIN_EMAIL=noreply@yourdomain.com
   SMTP_SENDER_NAME=우리집 가계부
   ```
6. GoTrue 재시작: `docker compose restart gotrue`

### 3.4 데이터베이스 마이그레이션 적용

```bash
cd ../supabase
# psql로 직접 적용 (Tailscale 또는 LAN에서)
psql "postgresql://postgres:<POSTGRES_PASSWORD>@<MINI_PC_IP>:5432/postgres" \
  -f migrations/0001_init.sql \
  -f migrations/0002_rls.sql
```

---

## 4. 정적 빌드 배포 (선택 — 기본은 §3에서 web 컨테이너로 이미 배포됨)

기본 구성은 `docker compose up -d --build`에서 web 컨테이너가 함께 빌드·기동되므로 추가 작업 필요 없습니다.
미니 PC가 약하거나 빌드 시간을 줄이려는 경우에만 외부 호스팅을 사용합니다.

### Option: Cloudflare Pages로 분리 배포
```bash
# 로컬에서 빌드 → Cloudflare Pages에 연결 (GitHub 자동 빌드도 가능)
npm run build
# 환경변수 (Pages 대시보드):
#   VITE_SUPABASE_URL=https://gagyebu.yourdomain.com
#   VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
이 경우 cloudflared 설정을 두 호스트로 변경:
```yaml
ingress:
  - hostname: gagyebu.yourdomain.com           # Pages가 처리 (cloudflared 라우팅 불필요)
  - hostname: api.gagyebu.yourdomain.com
    service: http://localhost:8000             # kong 직접
```
그리고 `nginx.conf`의 CSP `connect-src`에 `api.gagyebu.yourdomain.com` 추가.

---

## 5. 백업 자동화 (M5.9)

```bash
sudo apt install -y age
sudo cp infra/backup.sh /usr/local/bin/gagyebu-backup
sudo chmod +x /usr/local/bin/gagyebu-backup

# age 키 생성
age-keygen -o ~/.age/backup.key   # 공개키 복사

# .env에 백업 설정
#   BACKUP_DIR=/var/backups/gagyebu
#   BACKUP_AGE_RECIPIENT=age1xxxxx...   # 공개키
#   B2_KEY_ID=...
#   B2_APPLICATION_KEY=...
#   B2_BUCKET=gagyebu-backup

# 매일 03:00 cron
sudo crontab -e
# 추가:
#   0 3 * * * /usr/local/bin/gagyebu-backup >> /var/log/gagyebu-backup.log 2>&1
```

복구는 `infra/restore.sh` 참조.

---

## 6. 모니터링 (M5.9)

### Uptime Kuma 셀프호스팅 (선택)
```bash
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
# Tailscale로 http://<MINIPC>:3001 접근 → 모니터 추가:
#   - https://gagyebu.yourdomain.com (HTTP 200, 5분 주기)
#   - HTTP keyword "Supabase" (실패 시 카카오톡/메일 알림)
```

---

## 7. 카오스 테스트 체크리스트 (M5.10)

- [ ] 다른 가족 user_id의 JWT로 `SELECT * FROM transactions WHERE household_id = '<other>'` → 0건 반환
- [ ] 다른 가족 user_id로 INSERT 시도 → RLS denied
- [ ] 만료된 초대 토큰으로 accept-invite → 401
- [ ] 미니 PC 강제 종료 후 재부팅 → 모든 서비스 자동 기동, 데이터 손실 0
- [ ] `pg_dump` 백업을 다른 환경(별도 docker-compose)에 복원 → 데이터 일치
- [ ] 비밀번호 brute force: 동일 이메일 10회 시도 → rate limit (429)
- [ ] CSP 위반: `<script>` 인라인 삽입 시도 → 브라우저 차단

---

## 8. 일상 운영 명령어

```bash
# 로그 보기
docker compose logs -f gotrue
docker compose logs -f postgres

# 재시작
docker compose restart gotrue

# 이미지 업데이트 (월 1회)
docker compose pull
docker compose up -d
docker image prune -f

# 백업 수동 실행
sudo /usr/local/bin/gagyebu-backup

# 데이터 다운로드 (psql로 SELECT 후 CSV 저장)
docker compose exec postgres psql -U postgres -c "\copy transactions TO STDOUT WITH CSV HEADER" > tx-$(date +%F).csv
```
