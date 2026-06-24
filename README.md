# pie-gemma4

[pie](https://github.com/jikime/pie-lab) CLI 기반 AI 코딩 어시스턴트 + **Gemma 웹 챗봇**.

## 웹 챗봇 실행

```bash
# 1) Ollama에 모델 등록 (이름은 .pie/models.json 과 일치해야 함)
ollama pull xentriom/gemma-4-12B-coder-fable5-composer2.5-v1

# 2) 환경 설정
cp .env.example .env

# 3) 의존성 + 개발 서버
npm install
npm run dev
```

- Web UI: http://127.0.0.1:5173
- API: http://127.0.0.1:3001

### 모드 전환

`.env`의 `PIE_MODE`:

| 값 | 도구 | 용도 |
|----|------|------|
| `chat` (기본) | 없음 (설명만) | 웹 노출 안전, 로컬 모델 환각 방지 |
| `agent` | + bash, edit, write | 로컬 전용 |

### 프로젝트 구조

```
apps/server   Fastify + @pie-lab/coding-agent SDK (SSE API)
apps/web      Vite + React 챗 UI
.pie/models.json   Ollama 모델 설정
docs/plan.md       아키텍처 계획
```

### Docker 실행

Docker는 **server + web만** 띄우고, Ollama는 **호스트(Mac Metal GPU)** 에서 실행한다. Docker 컨테이너 안 Ollama는 GPU를 못 쓴다.

```bash
# 1) 호스트 Ollama 실행 (앱 또는 ollama serve)
ollama pull xentriom/gemma-4-12B-coder-fable5-composer2.5-v1

# 2) Docker server + web
npm run docker:up

# 로그
npm run docker:logs

# 종료
npm run docker:down
```

- Web UI: http://localhost:5173 (nginx → `/api` 프록시 → server)
- Ollama API: http://localhost:11434 (호스트)
- server → `http://host.docker.internal:11434/v1` 로 호스트 Ollama 연결

#### E2E 테스트

```bash
bash scripts/test-chat.sh
```

#### OOM (`signal: killed`) 트러블슈팅

12B Q4 모델은 Docker VM 메모리 ~8GB에서는 KV cache + weights 로드 시 OOM으로 kill될 수 있다. 아래 순서로 시도:

1. **Docker Desktop RAM 증가** (권장 12GB) — Docker Desktop → Settings → Resources → Memory. 적용 후 Docker 재시작.
2. **`contextWindow` 축소** — `.pie/models.json`, `docker/models.json`에서 `128000` → `8192`.
3. **호스트 Ollama 사용** (권장) — Docker Ollama 대신 Mac Metal GPU. 현재 `docker-compose.yml` 기본 구성.

---

## pie CLI 레퍼런스

> `pie --help` (v0.2.1, `/opt/homebrew/bin/pie`) 출력 기준 정리

## 개요

`pie`는 **read, bash, edit, write** 등 내장 도구를 갖춘 터미널 AI 코딩 어시스턴트다. 대화형·비대화형 모두 지원하며, 세션 저장/재개, 확장·스킬·프롬프트 템플릿 로딩, 다중 LLM 프로바이더 연동이 가능하다.

## 빠른 시작

```bash
# 대화형
pie

# 프롬프트와 함께 시작
pie "src/ 아래 .ts 파일 목록 보여줘"

# 파일 첨부
pie @prompt.md @image.png "이 이미지 설명해줘"

# 비대화형 (실행 후 종료)
pie -p "package.json 읽고 의존성 요약해줘"

# 이전 세션 이어하기
pie --continue "아까 뭐 얘기했지?"

# 모델 지정
pie --provider openai --model gpt-4o-mini "리팩터링 도와줘"
pie --model openai/gpt-4o "리팩터링 도와줘"
pie --model sonnet:high "복잡한 문제 풀어줘"
```

## 명령어

### 메인

```
pie [options] [@files...] [messages...]
```

| 옵션 | 설명 |
|------|------|
| `--provider <name>` | 프로바이더 (기본: `google`) |
| `--model <pattern>` | 모델 패턴/ID (`provider/id`, `:thinking` 지원) |
| `--api-key <key>` | API 키 (미지정 시 env) |
| `--system-prompt <text>` | 시스템 프롬프트 |
| `--append-system-prompt <text>` | 시스템 프롬프트에 추가 (반복 가능) |
| `--mode <mode>` | 출력 모드: `text` (기본), `json`, `rpc` |
| `--print`, `-p` | 비대화형 모드 |
| `--continue`, `-c` | 이전 세션 이어하기 |
| `--resume`, `-r` | 세션 선택 후 재개 |
| `--session <path\|id>` | 특정 세션 파일/UUID |
| `--session-id <id>` | 프로젝트 세션 ID (없으면 생성) |
| `--fork <path\|id>` | 세션을 fork |
| `--session-dir <dir>` | 세션 저장/조회 디렉터리 |
| `--no-session` | 세션 저장 안 함 |
| `--name`, `-n <name>` | 세션 표시 이름 |
| `--models <patterns>` | Ctrl+P 모델 순환 목록 (glob/fuzzy) |
| `--no-tools`, `-nt` | 모든 도구 비활성화 |
| `--no-builtin-tools`, `-nbt` | 내장 도구만 비활성화 |
| `--tools`, `-t <tools>` | 허용 도구 allowlist |
| `--exclude-tools`, `-xt <tools>` | 도구 denylist |
| `--thinking <level>` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| `--extension`, `-e <path>` | 확장 파일 로드 |
| `--no-extensions`, `-ne` | 확장 자동 탐색 비활성화 |
| `--skill <path>` | 스킬 파일/디렉터리 로드 |
| `--no-skills`, `-ns` | 스킬 탐색 비활성화 |
| `--prompt-template <path>` | 프롬프트 템플릿 로드 |
| `--no-prompt-templates`, `-np` | 템플릿 탐색 비활성화 |
| `--theme <path>` | 테마 로드 |
| `--no-themes` | 테마 탐색 비활성화 |
| `--no-context-files`, `-nc` | `AGENTS.md`, `CLAUDE.md` 로딩 비활성화 |
| `--export <file>` | 세션을 HTML로 export 후 종료 |
| `--list-models [search]` | 사용 가능 모델 목록 |
| `--verbose` | verbose 시작 |
| `--approve`, `-a` | 프로젝트 로컬 파일 신뢰 |
| `--no-approve`, `-na` | 프로젝트 로컬 파일 무시 |
| `--offline` | 시작 시 네트워크 비활성화 |
| `--help`, `-h` | 도움말 |
| `--version`, `-v` | 버전 |

### 서브커맨드

| 커맨드 | 설명 |
|--------|------|
| `pie install <source> [-l]` | 확장 설치 및 settings 등록 |
| `pie remove <source> [-l]` | 확장 제거 (`uninstall` 별칭) |
| `pie update [source\|self\|pie]` | pie/확장 업데이트 |
| `pie list` | 설치된 확장 목록 |
| `pie config` | TUI로 패키지 리소스 on/off |
| `pie curator <command>` | 학습 스킬 라이프사이클 관리 |
| `pie learning <command>` | 백그라운드 학습 리뷰 조회/승인 |

#### install / remove

```bash
pie install npm:@foo/bar
pie install git:github.com/user/repo
pie install ./local/path
pie install -l npm:@foo/bar          # 프로젝트 로컬 (.pie/settings.json)

pie remove npm:@foo/bar
pie uninstall npm:@foo/bar -l
```

#### update

```bash
pie update                  # pie + 모든 확장
pie update pie              # pie만 (self, pi 별칭)
pie update npm:@foo/bar     # 특정 패키지만
pie update --force          # 최신이어도 pie 재설치
```

#### curator

| 커맨드 | 설명 |
|--------|------|
| `status` | 스킬 상태·마지막 consolidation 정보 |
| `run` | idle 기반 아카이브 정책 적용 (LLM 없음) |
| `consolidate` | LLM으로 좁은 스킬을 umbrella로 병합 |
| `pin` / `unpin` | 스킬 고정/해제 |
| `archive` / `restore` | 수동 아카이브/복원 |
| `backup` | 스킬 스냅샷 |
| `prune` | 아카이브 만료 스킬 영구 삭제 |
| `rollback [backupPath]` | 백업에서 복원 |

#### learning

| 커맨드 | 설명 |
|--------|------|
| `status` | 학습 리뷰 상태 |
| `history [--limit N]` | 리뷰 이력 |
| `show <review-id>` | 리뷰 상세 |
| `proposals` | 제안 목록 |
| `approve <review-id>` | 승인 |
| `reject <review-id>` | 거부 |
| `mode auto\|suggest\|off` | 학습 모드 설정 |

## 내장 도구

| 도구 | 설명 | 기본 |
|------|------|------|
| `read` | 파일 읽기 | on |
| `bash` | bash 실행 | on |
| `edit` | find/replace 편집 | on |
| `write` | 파일 쓰기 | on |
| `grep` | 내용 검색 (read-only) | off |
| `find` | glob 파일 탐색 (read-only) | off |
| `ls` | 디렉터리 목록 (read-only) | off |

읽기 전용 모드 예시:

```bash
pie --tools read,grep,find,ls -p "src/ 코드 리뷰해줘"
pie --exclude-tools ask_question
```

## 환경 변수

### API 키 (주요)

| 변수 | 프로바이더 |
|------|-----------|
| `ANTHROPIC_API_KEY` / `ANTHROPIC_OAUTH_TOKEN` | Anthropic Claude |
| `OPENAI_API_KEY` | OpenAI |
| `GEMINI_API_KEY` | Google Gemini |
| `DEEPSEEK_API_KEY` | DeepSeek |
| `GROQ_API_KEY` | Groq |
| `OPENROUTER_API_KEY` | OpenRouter |
| `AZURE_OPENAI_*` | Azure OpenAI |
| `AWS_*` / `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock |

전체 목록은 `pie --help` 하단 Environment Variables 섹션 참고.

### pie 설정

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PIE_CODING_AGENT_DIR` | 설정 디렉터리 | `~/.pie/agent` |
| `PIE_CODING_AGENT_SESSION_DIR` | 세션 저장 디렉터리 | (`--session-dir`로 override) |
| `PIE_PACKAGE_DIR` | 패키지 디렉터리 override | — |
| `PIE_OFFLINE` | `1`/`true`/`yes` 시 네트워크 비활성화 | — |
| `PIE_TELEMETRY` | 설치 텔레메트리 on/off | — |
| `PIE_SHARE_VIEWER_URL` | `/share` 명령 base URL | — |

## 세션 export

```bash
pie --export ~/.pie/agent/sessions/--path--/session.jsonl
pie --export session.jsonl output.html
```

## 로컬 Ollama (Gemma) 예시

로컬 Ollama를 OpenAI 호환 API로 쓰는 경우:

```bash
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://localhost:11434/v1

pie --provider openai --model xentriom/gemma-4-12B-coder-fable5-composer2.5-v1 \
  -p "행렬 회전 알고리즘을 파이썬으로 작성해줘"
```

> 모델명은 `ollama list`에 등록된 이름과 일치해야 한다.

## 참고

- 확장은 추가 플래그를 등록할 수 있다 (예: plan-mode의 `--plan`).
- `pie config`는 TUI이므로 터미널에서 직접 실행해야 한다.
- 프로젝트 로컬 설정: `.pie/settings.json` (`pie install -l`)
