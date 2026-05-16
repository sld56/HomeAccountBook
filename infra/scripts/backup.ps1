# 우리집 가계부 — Windows용 백업 스크립트 (PowerShell)
# 사용: Windows Task Scheduler에서 매일 03:00 실행
# 의존: docker compose가 PATH에 있어야 함 (Docker Desktop 설치 후 기본)
#       age.exe가 PATH 또는 같은 폴더에 있어야 함 (https://github.com/FiloSottile/age/releases)

param(
  [string]$EnvFile = "$PSScriptRoot\..\.env",
  [string]$ComposeDir = "$PSScriptRoot\.."
)

$ErrorActionPreference = 'Stop'

# .env 로드
if (-not (Test-Path $EnvFile)) {
  throw ".env 파일을 찾을 수 없습니다: $EnvFile"
}
Get-Content $EnvFile | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } | ForEach-Object {
  $key, $value = $matches[1], $matches[2].Trim('"')
  Set-Variable -Name $key -Value $value -Scope Script
}

if (-not $BACKUP_DIR) { throw "BACKUP_DIR 환경변수가 없습니다" }
if (-not $BACKUP_AGE_RECIPIENT) { throw "BACKUP_AGE_RECIPIENT가 없습니다" }

$DateStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$DailyDir = Join-Path $BACKUP_DIR 'daily'
$WeeklyDir = Join-Path $BACKUP_DIR 'weekly'
$MonthlyDir = Join-Path $BACKUP_DIR 'monthly'
New-Item -ItemType Directory -Force -Path $DailyDir, $WeeklyDir, $MonthlyDir | Out-Null

$OutFile = Join-Path $DailyDir "gagyebu-$DateStamp.pgdump.age"
Write-Host "[$DateStamp] 백업 시작 → $OutFile"

# 1. docker exec로 pg_dump → age로 암호화하면서 파일에 쓰기
Push-Location $ComposeDir
try {
  $tempDump = [System.IO.Path]::GetTempFileName()
  try {
    docker compose exec -T postgres pg_dump -U postgres -Fc -Z 9 postgres `
      | Set-Content -Path $tempDump -Encoding Byte -NoNewline

    if ($LASTEXITCODE -ne 0) { throw "pg_dump 실패 (exit $LASTEXITCODE)" }

    age -r $BACKUP_AGE_RECIPIENT -o $OutFile $tempDump
    if ($LASTEXITCODE -ne 0) { throw "age 암호화 실패 (exit $LASTEXITCODE)" }
  }
  finally {
    Remove-Item $tempDump -Force -ErrorAction SilentlyContinue
  }
}
finally {
  Pop-Location
}

$Size = (Get-Item $OutFile).Length
Write-Host "[$DateStamp] 덤프 완료: $([math]::Round($Size / 1MB, 2)) MB"

# 2. 주별 / 월별 사본
$WeekDay = (Get-Date).DayOfWeek
$DayOfMonth = (Get-Date).Day
if ($WeekDay -eq 'Monday') {
  Copy-Item $OutFile $WeeklyDir
  Write-Host "[$DateStamp] 주별 사본 저장"
}
if ($DayOfMonth -eq 1) {
  Copy-Item $OutFile $MonthlyDir
  Write-Host "[$DateStamp] 월별 사본 저장"
}

# 3. 보존 정책
$Now = Get-Date
Get-ChildItem $DailyDir -Filter '*.pgdump.age' |
  Where-Object { $_.LastWriteTime -lt $Now.AddDays(-7) } |
  Remove-Item -Force
Get-ChildItem $WeeklyDir -Filter '*.pgdump.age' |
  Where-Object { $_.LastWriteTime -lt $Now.AddDays(-28) } |
  Remove-Item -Force
Get-ChildItem $MonthlyDir -Filter '*.pgdump.age' |
  Where-Object { $_.LastWriteTime -lt $Now.AddDays(-365) } |
  Remove-Item -Force

Write-Host "[$DateStamp] 백업 성공"
