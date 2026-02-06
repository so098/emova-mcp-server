# Emova MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.12-green)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Emova**를 위한 행동과학 연구 도구를 제공하는 MCP(Model Context Protocol) 서버입니다. Emova는 맥락 정보를 마이크로 액션으로 전환하는 자기조절 프레임워크입니다.

## Emova란?

Emova는 맥락 신호(에너지 수준, 집중도, 기분 등)를 활용해 다음에 할 일을 결정하는 생산성 프레임워크입니다. 세 단계 사이클로 작동합니다:

1. **맥락 → 정보** — 자기 보고 상태를 무시하지 않고, 의사결정 입력값으로 활용합니다 (Affect-as-Information 이론).
2. **작은 행동 → 자기효능감** — 부담스러운 목표 대신, 확실히 완수할 수 있는 마이크로 액션 하나를 실행합니다. 작은 성공이 쌓이면서 "나도 할 수 있다"는 감각이 회복됩니다 (Bandura의 자기효능감 이론 + Implementation Intentions).
3. **회고 → 패턴 인식** — 행동 기록을 정기적으로 리뷰하며 "막힐 때 짧은 산책이 도움이 된다" 같은 개인 패턴을 발견합니다 (Expressive Writing + 메타인지 연구).

이 MCP 서버는 Emova의 리서치 엔진을 외부에 노출합니다: PubMed에서 관련 논문 검색, 가설별 논문 분류, 모호한 할 일을 맥락 기반 마이크로 액션 계획으로 구체화하는 기능을 제공합니다.

## 아키텍처

```
emova-mcp-server
├── 3 Tools      — search_emova_papers, classify_paper_for_emova, refine_ambiguous_task
├── 3 Resources  — emova://hypotheses/{hypothesis_key}  (가설당 하나)
└── 2 Prompts    — search-for-hypothesis, refine-task-with-emotion
```

| 레이어 | 이름 | 설명 |
|--------|------|------|
| **Tool** | `search_emova_papers` | Emova 가설과 관련된 논문을 PubMed에서 검색 |
| **Tool** | `classify_paper_for_emova` | 논문(DOI 또는 초록)을 Emova의 세 가설 기준으로 분류 |
| **Tool** | `refine_ambiguous_task` | 모호한 할 일 + 현재 맥락을 맥락 기반 마이크로 액션 계획으로 변환 |
| **Resource** | `emova://hypotheses/*` | 각 가설의 상세 설명과 주요 참고문헌 |
| **Prompt** | `search-for-hypothesis` | 가설에 대한 연구를 검색하고 분석하는 가이드 워크플로 |
| **Prompt** | `refine-task-with-emotion` | 개인화된 마이크로 액션 계획을 생성하는 가이드 워크플로 |

## 빠른 시작

### 사전 요구사항

- Node.js 18+
- npm

### 설치 및 빌드

```bash
git clone https://github.com/hansoyoung/emova-mcp-server.git
cd emova-mcp-server
npm install
npm run build
```

### MCP 클라이언트 연결

MCP 클라이언트 설정 파일(예: Claude Desktop의 `claude_desktop_config.json`)에 다음을 추가하세요:

```json
{
  "mcpServers": {
    "emova-research": {
      "command": "node",
      "args": ["/absolute/path/to/emova-mcp-server/build/index.js"]
    }
  }
}
```

### 선택사항: PubMed API 키

더 높은 요청 한도를 사용하려면 `NCBI_API_KEY` 환경변수를 설정하세요:

```json
{
  "mcpServers": {
    "emova-research": {
      "command": "node",
      "args": ["/absolute/path/to/emova-mcp-server/build/index.js"],
      "env": {
        "NCBI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tools API 레퍼런스

### `search_emova_papers`

Emova 가설과 관련된 논문을 PubMed에서 검색합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `hypothesis` | `enum` | Yes | `emotion_as_information` \| `small_actions_self_efficacy` \| `reflection_pattern_recognition` |
| `query` | `string` | Yes | 자유 텍스트 검색 키워드 |
| `year_from` | `number` | No | 검색 시작 연도 |
| `year_to` | `number` | No | 검색 종료 연도 |
| `max_results` | `number` | No | 최대 결과 수 (기본값: 10) |
| `population` | `enum` | No | 연구 범위를 좁히기 위한 임상 집단 필터: `general` \| `adhd` \| `anxiety_disorder` \| `depression` \| `adhd_with_anxiety_or_depression` |

### `classify_paper_for_emova`

논문을 키워드 매칭으로 Emova의 세 가설에 대해 분류합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `doi` | `string` | No | 논문 DOI (PubMed에서 초록을 가져옴) |
| `abstract_text` | `string` | No | 초록 텍스트 (DOI가 없을 경우 사용) |

> `doi` 또는 `abstract_text` 중 하나는 반드시 제공해야 합니다.

**반환값:** 가설 태그, 매칭된 키워드, 각 가설에 대한 근거 문장.

### `refine_ambiguous_task`

모호한 할 일을 맥락 기반 마이크로 액션 계획으로 변환합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `raw_task` | `string` | Yes | 사용자의 모호한 할 일 설명 |
| `current_emotion` | `string` | Yes | 사용자의 자기 보고 상태 (예: 피곤함, 불안함, 의욕적) |
| `growth_focus` | `string` | No | `self_efficacy` \| `reduce_avoidance` \| `self_compassion` |

**반환값:** 구체화된 목표, if-then 계획과 추천 행동, 근거, 응답 톤 가이드라인.

## 개발

### 테스트 실행

```bash
npm test              # 전체 테스트 1회 실행
npm run test:watch    # 워치 모드로 테스트 실행
```

### 린트 및 포맷

```bash
npm run lint          # ESLint 실행
npm run format        # Prettier로 코드 포맷
```

### 빌드

```bash
npm run build         # TypeScript를 build/로 컴파일
```

### 프로젝트 구조

```
src/
├── index.ts                  # 서버 진입점
├── types.ts                  # 공유 타입 정의
├── lib/
│   ├── pubmed.ts             # PubMed API 클라이언트 및 키워드 분류기
│   └── __tests__/
│       └── pubmed.test.ts
├── tools/
│   ├── search-papers.ts      # search_emova_papers 도구
│   ├── classify-paper.ts     # classify_paper_for_emova 도구
│   ├── refine-task.ts        # refine_ambiguous_task 도구
│   └── __tests__/
│       ├── classify-paper.test.ts
│       └── refine-task.test.ts
├── resources/
│   └── hypotheses.ts         # 가설 리소스 정의
└── prompts/
    └── emova-prompts.ts      # 프롬프트 템플릿
```

## 라이선스

MIT
