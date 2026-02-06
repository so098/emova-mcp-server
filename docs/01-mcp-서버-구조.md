# MCP 서버 구조

## MCP(Model Context Protocol)란?

MCP는 Anthropic이 만든 **오픈 표준 프로토콜**로, AI 모델(Claude 등)이 외부 도구(Tool), 데이터 소스(Resource), 프롬프트 템플릿(Prompt)에 접근할 수 있게 해준다.

기존에는 AI에 외부 기능을 연결하려면 각 서비스마다 별도 API 래퍼를 만들어야 했다. MCP는 이 과정을 표준화해서, **하나의 프로토콜로 도구·데이터·프롬프트를 통일적으로 제공**할 수 있게 한다.

```
┌──────────────────┐     stdio/SSE     ┌──────────────────┐
│  MCP Client      │ ◄──────────────► │  MCP Server      │
│  (Claude Desktop,│                   │  (emova-research)│
│   IDE 등)        │                   │                  │
└──────────────────┘                   └──────────────────┘
```

- **Client**: Claude Desktop, VS Code 확장 등 AI가 탑재된 호스트 애플리케이션
- **Server**: 도구/리소스/프롬프트를 등록하고, Client 요청에 응답하는 프로세스
- **Transport**: Client↔Server 통신 방식 (stdio, SSE 등)

## 왜 MCP를 선택했는가?

1. **Claude Desktop/IDE에서 바로 사용 가능**: `claude_desktop_config.json`에 서버 경로만 등록하면, Claude가 도구를 자동 인식하고 호출한다
2. **표준화된 인터페이스**: Tool, Resource, Prompt 3가지 primitive로 기능을 명확히 분류할 수 있다
3. **런타임 안전성**: Zod 스키마로 입력을 검증하고, 에러 처리가 프로토콜 수준에서 지원된다
4. **경량 구현**: Node.js + TypeScript만으로 서버를 구현할 수 있고, 별도 HTTP 서버 없이 stdio 기반으로 동작한다

## 서버 초기화 흐름 (`src/index.ts`)

```typescript
// 1. McpServer 인스턴스 생성
const server = new McpServer({
  name: "emova-research",
  version: "1.0.0",
});

// 2. Tool 등록 (3개)
registerSearchPapers(server);    // search_emova_papers
registerClassifyPaper(server);   // classify_paper_for_emova
registerRefineTask(server);      // refine_ambiguous_task

// 3. Resource 등록 (3개)
registerHypothesisResources(server);
// → emova://hypotheses/emotion_as_information
// → emova://hypotheses/small_actions_self_efficacy
// → emova://hypotheses/reflection_pattern_recognition

// 4. Prompt 등록 (2개)
registerPrompts(server);
// → search-for-hypothesis
// → refine-task-with-emotion

// 5. StdioServerTransport로 실행
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Emova MCP Server running on stdio");
}
```

**핵심 포인트**: 각 모듈이 `register*` 함수를 export하고, `index.ts`가 이들을 조립하는 구조. 서버 자체는 상태를 갖지 않고, 각 요청마다 독립적으로 처리한다.

## 디렉토리 구조와 모듈 역할

```
src/
├── index.ts              # 서버 진입점 — McpServer 생성, 모듈 등록, transport 실행
├── types.ts              # 공유 타입 정의 (Hypothesis, Population, PaperMetadata)
├── lib/
│   └── pubmed.ts         # PubMed API 호출 + 논문 분류 로직 (순수 라이브러리)
├── tools/
│   ├── search-papers.ts  # search_emova_papers 도구 — 가설별 논문 검색
│   ├── classify-paper.ts # classify_paper_for_emova 도구 — 논문→가설 분류
│   └── refine-task.ts    # refine_ambiguous_task 도구 — 감정 기반 행동 계획
├── resources/
│   └── hypotheses.ts     # 3가지 가설 리소스 (emova://hypotheses/*)
└── prompts/
    └── emova-prompts.ts  # 2개 프롬프트 템플릿
```

### 각 레이어의 역할

| 레이어 | 역할 | MCP Primitive |
|--------|------|---------------|
| `lib/` | 외부 API 호출, 데이터 처리 등 **비즈니스 로직** | 없음 (순수 라이브러리) |
| `tools/` | Claude가 **호출**할 수 있는 함수 (입력→출력) | Tool |
| `resources/` | Claude가 **읽을** 수 있는 정적 데이터 | Resource |
| `prompts/` | Claude에게 **지시**를 내리는 템플릿 | Prompt |

### MCP의 3가지 Primitive

- **Tool**: 클라이언트(Claude)가 파라미터를 넘겨 호출하면, 서버가 처리 후 결과를 반환. 함수 호출과 유사.
- **Resource**: URI로 접근하는 읽기 전용 데이터. `emova://hypotheses/emotion_as_information` 같은 커스텀 URI 스킴 사용.
- **Prompt**: 특정 작업을 위한 프롬프트 템플릿. 파라미터를 받아 메시지 배열을 생성하고, Claude가 이를 기반으로 응답.

## 등록된 기능 목록

### Tools (3개)

| 도구명 | 파일 | 설명 |
|--------|------|------|
| `search_emova_papers` | `tools/search-papers.ts` | PubMed에서 가설 관련 논문 검색 |
| `classify_paper_for_emova` | `tools/classify-paper.ts` | DOI/초록으로 논문→가설 분류 |
| `refine_ambiguous_task` | `tools/refine-task.ts` | 감정 기반 작은 행동 계획 생성 |

### Resources (3개)

| 리소스 URI | 내용 |
|------------|------|
| `emova://hypotheses/emotion_as_information` | 감정→정보 가설 상세 |
| `emova://hypotheses/small_actions_self_efficacy` | 작은 행동→자기효능감 가설 상세 |
| `emova://hypotheses/reflection_pattern_recognition` | 회고→패턴 인식 가설 상세 |

### Prompts (2개)

| 프롬프트명 | 용도 |
|-----------|------|
| `search-for-hypothesis` | 가설 기반 논문 검색 + 인사이트 정리 워크플로우 |
| `refine-task-with-emotion` | 감정 상태 기반 할 일 구체화 워크플로우 |
