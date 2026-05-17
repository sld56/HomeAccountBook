# Windows 미니 PC 셋업 가이드

> Linux 가이드 [README.md](README.md)의 Windows 버전.
> Docker Desktop + WSL2를 활용해 동일한 docker-compose 스택을 실행합니다.

---

## 0. Windows에서 24/7 운영의 트레이드오프

| 측면 | Windows 운영 |
|---|---|
| 자동 시작 | Docker Desktop은 사용자 로그인 시점에 시작 → **자동 로그인 설정** 필요 |
| Windows Update | 강제 재시작이 자동 → "활성 시간" 설정해도 한 달에 한두 번 재부팅 |
| 리소스 오버헤드 | Docker Desktop + WSL2가 ~2GB RAM 점유 (Linux 대비 +1GB) |
| 백업 스케줄 | Task Scheduler (cron 대신) |
| 추천 메모리 | 8GB 이상 |

**대안**: PC를 가계부 전용으로 쓰신다면 Ubuntu Server를 직접 설치하는 게 운영상 더 단순합니다. 다른 용도와 겸용이면 아래 Windows 가이드를 따르세요.

---

## 1. Windows 사전 준비 (20분)

### 1.1 BIOS에서 가상화 활성화
1. 재부팅 → BIOS/UEFI 진입 (보통 F2/Del/F12)
2. **Intel VT-x** 또는 **AMD-V/SVM** **Enabled**
3. 저장 후 부팅

### 1.2 Windows 기능 활성화 (관리자 PowerShell)
```powershell
# WSL2 + 가상 머신 플랫폼
wsl --install
# 자동으로 Ubuntu가 함께 설치됨. 재부팅 안내가 뜨면 재부팅.
```

재부팅 후 PowerShell에서:
```powershell
wsl --set-default-version 2
wsl --update
wsl --list --verbose
# Ubuntu가 STATE Running, VERSION 2 로 표시되어야 정상
```

### 1.3 Docker Desktop 설치
1. [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) → Windows 다운로드
2. 설치 시 **Use WSL 2 instead of Hyper-V** 체크
3. 첫 실행 시 약관 동의 (개인·가족 사용은 무료)
4. **Settings → General**:
   - ✅ Start Docker Desktop when you sign in to your computer
   - ✅ Use the WSL 2 based engine
5. **Settings → Resources**: 메모리 4GB, CPU 2개 정도 할당
6. 작업 표시줄 고래 아이콘이 초록색이면 준비 완료

### 1.4 Git for Windows
[git-scm.com/download/win](https://git-scm.com/download/win) 설치. 설치 옵션은 기본값 그대로.

### 1.5 자동 로그인 (선택, 강력 권장)
미니 PC가 재부팅돼도 Docker Desktop이 자동으로 올라오려면 자동 로그인이 필요합니다.
```powershell
control userpasswords2
```
- "사용자 이름과 암호를 입력해야 컴퓨터를 사용할 수 있음" 체크 해제 → 비밀번호 두 번 입력 → 확인
- ⚠️ **물리적으로 안전한 곳**에 둬야 합니다 (가족 외 접근 차단)

### 1.6 절전 비활성화
```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 10
```

### 1.7 Windows Update 활성 시간 조정
**설정 → Windows Update → 활성 시간** → 가족이 가계부를 가장 안 쓰는 시간대를 활성 시간으로 (예: 06:00~22:00) → 재시작은 그 외 시간으로 미뤄짐.

---

## 2. Cloudflare Tunnel (Windows 버전) (20분)

### 2.1 cloudflared 설치
[github.com/cloudflare/cloudflared/releases](https://github.com/cloudflare/cloudflared/releases/latest) → `cloudflared-windows-amd64.exe` 다운로드 → `C:\cloudflared\cloudflared.exe`로 저장.

PowerShell에서 (관리자 권한):
```powershell
# PATH에 추가
$env:PATH += ";C:\cloudflared"
[Environment]::SetEnvironmentVariable("Path", $env:PATH, "Machine")

cloudflared --version
```

### 2.2 Cloudflare 인증 + 터널 생성
```powershell
cloudflared tunnel login
# 브라우저가 열리면 Cloudflare 계정으로 로그인 + 도메인 선택

cloudflared tunnel create gagyebu
# 출력에서 Tunnel ID(UUID) 메모. 인증 파일은 %USERPROFILE%\.cloudflared\<UUID>.json

cloudflared tunnel route dns gagyebu gagyebu.yourdomain.com
```

### 2.3 설정 파일
`%USERPROFILE%\.cloudflared\config.yml` 만들기 (PowerShell):
```powershell
$Config = @"
tunnel: gagyebu
credentials-file: $env:USERPROFILE\.cloudflared\<UUID>.json
ingress:
  - hostname: gagyebu.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
"@
$Config | Out-File -FilePath "$env:USERPROFILE\.cloudflared\config.yml" -Encoding utf8
```
`<UUID>`는 위에서 메모한 값으로 교체.

### 2.4 Windows 서비스로 등록
```powershell
# 관리자 PowerShell
cloudflared service install
Start-Service cloudflared
Get-Service cloudflared
```
서비스가 **Running** 상태면 OK.

---

## 3. 프로젝트 가져오기 (10분)

WSL2(Ubuntu) 안에서 클론하는 것을 **강력 권장**합니다 — Docker가 WSL 파일시스템에서 훨씬 빠릅니다.

```powershell
wsl
```

WSL 안에서:
```bash
# Node.js (키 생성에 필요)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 프로젝트
cd ~
git clone <당신의-저장소-URL> gagyebu
cd gagyebu

# 키 생성
node infra/scripts/gen-keys.mjs
# 출력 복사
```

```bash
# .env 작성
cd infra
cp .env.example .env
chmod 600 .env
nano .env   # 또는 code .env (VS Code Remote-WSL 설치되어 있으면)
```

`.env` 채우기:
- `SITE_URL=https://gagyebu.yourdomain.com`
- gen-keys 출력의 JWT/POSTGRES/REALTIME/ANON/SERVICE 키 그대로
- SMTP 항목은 §5에서 채움

> 💡 **이 단계에서 GitHub Secrets도 함께 등록**해두세요. GitHub 저장소 → Settings → Secrets and variables → Actions에 `VITE_SUPABASE_URL`(SITE_URL과 동일)과 `VITE_SUPABASE_ANON_KEY`(ANON_KEY와 동일). [CI-IMAGES.md §A](CI-IMAGES.md#a-github-secrets-등록-3분) 참조.

---

## 4. Docker 이미지 받기 + 기동 (5분)

**클라이언트 이미지는 GitHub Actions가 미리 빌드해뒀습니다.** 미니 PC는 그냥 pull만 받으면 됩니다.

### 4.0 ghcr.io 로그인 (한 번만)
[CI-IMAGES.md §C](CI-IMAGES.md#c-미니-pc에서-ghcrio-로그인-1회만) 따라 GitHub PAT(`read:packages` 권한) 발급 후:
```bash
echo "<PAT>" | docker login ghcr.io -u sld56 --password-stdin
```

### 4.1 컨테이너 기동
WSL 또는 PowerShell 둘 다 가능:
```bash
cd ~/gagyebu/infra
docker compose up -d
# Supabase 이미지 + ghcr.io의 web 이미지 모두 pull → 첫 기동 2~3분

docker compose ps   # web, postgres, gotrue, postgrest, realtime, edge-functions, kong, studio, meta 모두 healthy
```

PowerShell에서 했다면 경로:
```powershell
wsl
cd ~/gagyebu/infra
```

### 업데이트 받기 (코드 변경 후)
```bash
docker compose pull
docker compose up -d
# 1분 안에 새 버전 배포 완료
```

### DB 마이그레이션
```bash
docker compose exec -T postgres psql -U postgres -d postgres < ../supabase/migrations/0001_init.sql
docker compose exec -T postgres psql -U postgres -d postgres < ../supabase/migrations/0002_rls.sql
```

---

## 5. Resend 메일 발송 (15분)

리눅스 가이드 [§5](README.md#5-resend-도메인-검증-메일-발송)와 동일합니다.
`.env`를 갱신한 다음 gotrue만 재시작:
```bash
docker compose restart gotrue
```

---

## 6. 첫 접속 + 가족 가입

리눅스 가이드 [§7](README.md#7-첫-접속--가족-가입-15분)과 동일합니다.

---

## 7. 백업 자동화 (Windows 방식) (15분)

### 7.1 age.exe 설치
[github.com/FiloSottile/age/releases](https://github.com/FiloSottile/age/releases) → `age-vX.Y.Z-windows-amd64.zip` → 압축 풀어서 `age.exe`, `age-keygen.exe`를 `C:\age\`에 저장. PATH에 추가:
```powershell
$env:PATH += ";C:\age"
[Environment]::SetEnvironmentVariable("Path", $env:PATH, "Machine")
```

### 7.2 age 키 생성
```powershell
mkdir C:\backup-keys
age-keygen -o C:\backup-keys\gagyebu.key
# 출력에서 "Public key: age1xxxxx..." 줄을 메모
```
⚠️ `C:\backup-keys\gagyebu.key`는 다른 매체(USB, 클라우드 드라이브)에도 백업하세요.

### 7.3 .env에 백업 설정 추가
WSL에서:
```bash
nano ~/gagyebu/infra/.env
```
추가:
```
BACKUP_DIR=C:/Backups/gagyebu
BACKUP_AGE_RECIPIENT=age1xxxxxxxxxxxxxxxxxxxxxxxxx
```

미리 폴더 생성:
```powershell
mkdir C:\Backups\gagyebu
```

### 7.4 한 번 수동 실행
PowerShell:
```powershell
cd C:\path\to\gagyebu\infra\scripts
# WSL 쪽에 있으면: \\wsl$\Ubuntu\home\<user>\gagyebu\infra\scripts\backup.ps1
.\backup.ps1
```
`C:\Backups\gagyebu\daily\`에 `.pgdump.age` 파일이 생기면 성공.

### 7.5 Task Scheduler 등록 (매일 03:00)
PowerShell (관리자):
```powershell
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\path\to\gagyebu\infra\scripts\backup.ps1`""
$Trigger = New-ScheduledTaskTrigger -Daily -At 3am
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "GagyebuBackup" `
  -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings
```

확인:
```powershell
Get-ScheduledTask -TaskName "GagyebuBackup" | Get-ScheduledTaskInfo
```

---

## 8. 모니터링 (선택, 10분)

Uptime Kuma를 같은 Docker에 추가:
```bash
docker run -d --restart=always -p 127.0.0.1:3001:3001 `
  -v uptime-kuma:/app/data `
  --name uptime-kuma louislam/uptime-kuma:1
```
(PowerShell에선 `\` 대신 백틱 `` ` ``)

브라우저에서 `http://localhost:3001` → 모니터 추가 → `https://gagyebu.yourdomain.com` → 알림(이메일/Telegram) 설정.

---

## 9. Windows 운영 체크리스트

- [ ] BIOS 가상화 활성화 확인
- [ ] Docker Desktop "Start at sign in" 켜짐
- [ ] 자동 로그인 설정 (또는 수동으로 로그인 후 떠두기)
- [ ] 절전 비활성화 (`powercfg /change standby-timeout-ac 0`)
- [ ] Windows Update 활성 시간 가족 사용 시간대로
- [ ] cloudflared 서비스 자동 시작 (`Get-Service cloudflared` Status=Running, StartType=Auto)
- [ ] `docker compose ps` 모두 Up + healthy
- [ ] `https://gagyebu.yourdomain.com` 외부망에서 접속 확인 (모바일 LTE 등)
- [ ] 백업 Task가 한 번이라도 성공 (`Get-ScheduledTaskInfo`의 LastRunResult=0)
- [ ] age 비밀키 별도 보관 확인

---

## 10. Windows 특유 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `wsl --install` 실패 | 가상화 비활성 | BIOS에서 VT-x/SVM 활성화 |
| Docker Desktop 안 켜짐 | WSL 2 미설치 | `wsl --update` 후 재시도 |
| 컨테이너가 자꾸 재시작 | 메모리 부족 | Docker Desktop Settings → Resources에서 메모리 증설 |
| `cloudflared.exe` 인식 안 됨 | PATH 미반영 | PowerShell 재시작 또는 새 셸 열기 |
| 매직링크 메일 안 옴 | Windows Defender Firewall이 outbound SMTP 차단 | 보통 outbound는 허용. `docker compose logs gotrue` 확인 |
| Task Scheduler 백업 실행 안 됨 | ExecutionPolicy | 위 등록 명령에 `-ExecutionPolicy Bypass`가 포함됨 — 만약 다른 방법으로 등록했다면 정책 변경 |
| 미니 PC 재부팅 후 Tunnel 끊김 | cloudflared 서비스 StartType이 Manual | `Set-Service cloudflared -StartupType Automatic` |
| 백업 시 docker exec stdin 깨짐 | PowerShell 인코딩 | `backup.ps1`이 임시 파일을 통해 처리 (이미 반영) |

---

§1~§6만 끝내면 가족 사용 가능. §7~§8은 일주일 안에 추가하면 됩니다.
