# Zod 스키마 검증

## Zod란?

[Zod](https://github.com/colinhacks/zod)는 **TypeScript용 런타임 스키마 검증 라이브러리**다. 스키마를 정의하면 런타임에 데이터의 타입과 형식을 검증하고, 동시에 TypeScript 타입도 추론해준다.

```typescript
import { z } from "zod";

// 스키마 정의 = 런타임 검증 규칙 + TypeScript 타입 동시 생성
const UserSchema = z.object({
  name: z.string(),
  age: z.number().min(0),
});

type User = z.infer<typeof UserSchema>;
// → { name: string; age: number }
```

## MCP 도구에서 왜 런타임 검증이 필요한가?

### TypeScript 컴파일 타임 vs 런타임의 차이

```
[컴파일 타임]                          [런타임]
TypeScript 코드 ──tsc 컴파일──→ JavaScript 코드 ──실행──→ 실제 데이터 처리

                 타입 정보 사라짐!
                 number가 실제로 string이
                 들어와도 모름
```

- **컴파일 타임 타입 검사**: 코드 작성 시 개발자의 실수를 잡아줌. 하지만 컴파일 후 JavaScript로 변환되면 타입 정보가 모두 사라진다.
- **런타임 검증**: 실제 실행 중에 들어오는 데이터가 기대한 형식인지 확인. 외부 입력에 대해서는 이것만이 유일한 방어선.

### MCP의 특수한 상황

```
┌──────────────────┐         JSON-RPC         ┌──────────────────┐
│  Claude (Client) │  ────────────────────►  │  MCP Server      │
│  AI가 생성한 입력 │    어떤 값이 올지       │  Zod로 검증      │
│  (신뢰할 수 없음)│    보장할 수 없음       │                  │
└──────────────────┘                          └──────────────────┘
```

MCP 도구의 입력은 **외부 클라이언트(Claude AI)가 생성**한다. 이는 일반적인 함수 호출과 다른 점:

1. **AI가 생성한 입력**: Claude가 사용자 대화를 해석해서 도구 파라미터를 만든다. 항상 올바른 형식이라는 보장이 없다.
2. **JSON-RPC 프로토콜**: 네트워크를 통해 JSON 형태로 전달되므로, TypeScript 타입 시스템의 보호를 받지 못한다.
3. **다양한 클라이언트**: Claude Desktop뿐 아니라, 어떤 MCP 클라이언트든 연결 가능. 클라이언트 구현의 정확성을 신뢰할 수 없다.

**Zod가 해결하는 문제**: MCP SDK가 도구 호출 시 Zod 스키마로 자동 검증하여, 잘못된 입력이 비즈니스 로직까지 도달하지 못하게 한다.

## 3개 도구별 Zod 스키마

### 1. `search_emova_papers` (`src/tools/search-papers.ts`)

```typescript
{
  hypothesis: z.enum([
    "emotion_as_information",
    "small_actions_self_efficacy",
    "reflection_pattern_recognition",
  ]),
  query: z.string().describe("자유 텍스트 키워드"),
  year_from: z.number().optional().describe("검색 시작 연도"),
  year_to: z.number().optional().describe("검색 종료 연도"),
  max_results: z.number().default(10).optional().describe("최대 결과 수 (기본: 10)"),
  population: z
    .enum([
      "general",
      "adhd",
      "anxiety_disorder",
      "depression",
      "adhd_with_anxiety_or_depression",
    ])
    .optional()
    .describe("대상 집단 필터"),
}
```

| 파라미터 | Zod 타입 | 필수 | 검증 내용 |
|---------|---------|------|-----------|
| `hypothesis` | `z.enum([...])` | O | 3가지 가설 중 하나만 허용 |
| `query` | `z.string()` | O | 빈 문자열이 아닌 문자열 |
| `year_from` | `z.number().optional()` | X | 숫자 타입 보장 |
| `year_to` | `z.number().optional()` | X | 숫자 타입 보장 |
| `max_results` | `z.number().default(10).optional()` | X | 기본값 10 자동 적용 |
| `population` | `z.enum([...]).optional()` | X | 5가지 집단 중 하나 또는 미입력 |

### 2. `classify_paper_for_emova` (`src/tools/classify-paper.ts`)

```typescript
{
  doi: z.string().optional().describe("논문 DOI"),
  abstract_text: z
    .string()
    .optional()
    .describe("논문 초록 텍스트 (DOI가 없을 경우)"),
}
```

| 파라미터 | Zod 타입 | 필수 | 검증 내용 |
|---------|---------|------|-----------|
| `doi` | `z.string().optional()` | X | 문자열 타입 보장 |
| `abstract_text` | `z.string().optional()` | X | 문자열 타입 보장 |

**비즈니스 로직 검증**: 두 필드 모두 optional이지만, 핸들러 내부에서 둘 다 없으면 에러를 반환한다. Zod는 타입 수준 검증, 비즈니스 규칙은 코드로 처리하는 분리 구조.

```typescript
if (!doi && !abstract_text) {
  return {
    content: [{ type: "text", text: "doi 또는 abstract_text 중 하나를 반드시 입력해야 합니다." }],
    isError: true,
  };
}
```

### 3. `refine_ambiguous_task` (`src/tools/refine-task.ts`)

```typescript
{
  raw_task: z.string().describe("사용자가 적은 애매한 할 일"),
  current_emotion: z.string().describe("사용자가 보고한 감정 상태"),
  growth_focus: z
    .string()
    .optional()
    .describe("예: self_efficacy, reduce_avoidance, self_compassion"),
}
```

| 파라미터 | Zod 타입 | 필수 | 검증 내용 |
|---------|---------|------|-----------|
| `raw_task` | `z.string()` | O | 문자열 타입 보장 |
| `current_emotion` | `z.string()` | O | 문자열 타입 보장 |
| `growth_focus` | `z.string().optional()` | X | 자유 문자열 (enum이 아님) |

**설계 선택**: `growth_focus`를 `z.enum()`이 아닌 `z.string()`으로 정의한 이유 — `GROWTH_FOCUS_GUIDANCE`에 정의되지 않은 값이 들어와도 fallback 메시지를 생성한다. 유연성을 위해 의도적으로 열린 타입.

```typescript
const growthGuidance = growth_focus
  ? GROWTH_FOCUS_GUIDANCE[growth_focus] ??
    `성장 방향 '${growth_focus}'에 맞춰 행동을 조정해주세요.`
  : undefined;
```

## Zod가 MCP에서 동작하는 방식

MCP SDK의 `server.tool()` 메서드가 세 번째 인자로 Zod 스키마 객체를 받는다:

```typescript
server.tool(
  "도구_이름",                    // 1. 도구 이름
  "도구 설명",                    // 2. 설명 (Claude가 읽음)
  { /* Zod 스키마 객체 */ },      // 3. 입력 스키마 → 자동 검증
  async (params) => { /* ... */ } // 4. 핸들러 (검증 통과한 params만 받음)
);
```

SDK 내부 동작:
1. 클라이언트가 도구를 호출하면 JSON 파라미터가 전달됨
2. SDK가 Zod 스키마로 `.parse()` 수행
3. **검증 실패** → 클라이언트에 에러 응답 자동 반환 (핸들러 실행 안 됨)
4. **검증 통과** → 타입이 보장된 파라미터로 핸들러 실행

## `.describe()`의 역할

```typescript
query: z.string().describe("자유 텍스트 키워드"),
```

`.describe()`는 런타임 검증과는 무관하지만, MCP 프로토콜에서 중요한 역할을 한다:

- MCP SDK가 Zod 스키마를 **JSON Schema로 변환**할 때 `description` 필드로 포함됨
- Claude가 도구의 입력 스키마를 읽을 때 이 설명을 참고하여 적절한 파라미터를 생성
- 즉, `.describe()`는 **AI에게 보내는 파라미터 설명**

## 정리: 컴파일 타임 vs 런타임 검증 비교

| | TypeScript (컴파일 타임) | Zod (런타임) |
|---|---|---|
| **검사 시점** | `tsc` 컴파일 시 | 코드 실행 중 |
| **적용 범위** | 내부 코드 간 호출 | 외부 입력 (API, 사용자 입력 등) |
| **타입 정보** | `.js`로 컴파일 시 사라짐 | 런타임에 유지됨 |
| **에러 시점** | 개발 중 즉시 발견 | 실행 중 발견, 에러 핸들링 필요 |
| **MCP에서의 역할** | 개발자 실수 방지 | Claude가 보낸 입력 검증 |
| **비용** | 0 (빌드 타임에만 동작) | 약간의 런타임 오버헤드 |

**결론**: TypeScript의 타입 시스템은 "개발자 간" 계약이고, Zod는 "시스템 경계"에서의 계약이다. MCP 서버처럼 외부 클라이언트와 통신하는 경우, 두 가지를 모두 사용하는 것이 안전하다.
