# CI 이미지 자동 빌드/배포

> GitHub Actions가 코드 push마다 자동으로 Docker 이미지를 빌드해 ghcr.io에 올립니다.
> 미니 PC는 그 이미지를 pull만 하면 됩니다 — 로컬 빌드 불필요.

---

## 흐름 그림

```
[본인 PC]                              [GitHub]                       [미니 PC]
 git push  ───────►  main 브랜치  ───►  Actions 트리거
                                       (5~7분 빌드)
                                          │
                                          ▼
                                  ghcr.io/sld56/
                                  homeaccountbook-web:latest
                                          │
                                          └────────────────────────►  docker compose pull
                                                                       docker compose up -d
                                                                       (30초)
```

---

## 1회 셋업 (한 번만)

### A. GitHub Secrets 등록 (3분)
미니 PC에서 사용할 .env 값 중 2개를 GitHub Secrets에도 등록해야 빌드 시점에 React 번들에 들어갑니다.

1. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
2. 다음 2개를 추가:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://gagyebu.yourdomain.com` (본인 도메인) |
| `VITE_SUPABASE_ANON_KEY` | `gen-keys.mjs`가 출력한 ANON_KEY 그대로 |

> ⚠️ 이 두 값은 어차피 클라이언트 번들에 박혀 공개됩니다. 시크릿이 아니라 "빌드 인자"로 관리하기 위함입니다. JWT_SECRET·SERVICE_ROLE_KEY는 절대 여기 넣으면 안 됩니다.

### B. 워크플로 트리거
- 자동: `src/**`, `public/**`, `Dockerfile`, `package*.json` 등이 바뀌면 푸시 즉시 빌드 시작
- 수동: GitHub 저장소 → **Actions → "Build and Publish Docker Image" → Run workflow**

빌드 결과는 **저장소 → Packages**에서 확인 (`homeaccountbook-web` 패키지 표시됨).

### C. 미니 PC에서 ghcr.io 로그인 (1회만)

ghcr.io의 Private 패키지를 pull 하려면 PAT(Personal Access Token)로 한 번 로그인해야 합니다.

1. GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**
2. **Note**: `gagyebu-mini-pc-pull`
3. **Expiration**: No expiration (또는 1년)
4. **Scopes**: `read:packages` 만 체크
5. Generate → **토큰 복사**

미니 PC에서 (PowerShell 또는 WSL):
```bash
# WSL
echo "<PAT>" | docker login ghcr.io -u sld56 --password-stdin
```
```powershell
# PowerShell — 비밀번호 칸에 PAT 붙여넣기
docker login ghcr.io -u sld56
```

`Login Succeeded` 뜨면 끝. 이후 docker가 알아서 인증 정보 사용.

---

## 매번 사용 흐름

### 본인 PC에서 코드 변경 후

```bash
git add .
git commit -m "..."
git push
```

→ GitHub Actions가 자동으로 빌드 시작. **Actions 탭**에서 진행 확인 (5~7분).
→ 완료되면 `ghcr.io/sld56/homeaccountbook-web:latest`가 최신으로 갱신.

### 미니 PC에서 업데이트 받기

WSL Ubuntu:
```bash
cd ~/gagyebu/infra
docker compose pull          # 최신 이미지 받기 (30초)
docker compose up -d         # 갱신된 컨테이너 교체 (5초)
```

총 1분 안에 새 버전 가족이 사용 중인 사이트에 배포 완료.

---

## 미니 PC에서 로컬 빌드가 필요한 경우 (드물게)

GitHub Actions가 다운됐거나 인터넷이 끊겼는데 급히 빌드해야 할 때:

```bash
cd ~/gagyebu/infra
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

이러면 `image:` 대신 로컬 Dockerfile에서 빌드한 `homeaccountbook-web:dev`를 사용합니다.

---

## 이미지 태그 정책

GitHub Actions가 푸시 때마다 다음 태그를 모두 부여:

| 태그 | 용도 |
|---|---|
| `latest` | 최신 main 브랜치 (미니 PC는 이걸 pull) |
| `abc1234` (커밋 SHA 앞 7자리) | 특정 커밋으로 롤백할 때 |
| `42` (Actions run 번호) | 빌드 식별 |

특정 버전으로 롤백:
```bash
# 미니 PC .env에 추가
WEB_IMAGE=ghcr.io/sld56/homeaccountbook-web:abc1234

docker compose up -d
```

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| Actions가 `secret이 설정되지 않았습니다`로 실패 | A단계 GitHub Secrets 등록 |
| 미니 PC에서 `denied: requested access` (pull 실패) | C단계 `docker login ghcr.io` 안 함, 또는 PAT 만료 |
| 빌드는 성공인데 미니 PC가 옛 이미지 사용 중 | `docker compose pull` 잊음. `pull_policy: always` 설정돼 있으니 `up -d`만 다시 |
| Actions 빌드가 너무 느림 | 첫 빌드만 5~7분, 캐시(actions cache) 덕에 이후 2~3분 |
| 도메인 또는 anon key를 바꿔야 함 | GitHub Secrets 갱신 → Actions → Run workflow 수동 트리거 |
