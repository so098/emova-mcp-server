---
name: add-hypothesis
description: 새 가설을 Emova MCP 서버에 추가합니다.
argument-hint: "[hypothesis-key]"
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

새 가설을 Emova MCP 서버에 추가합니다.

인자로 가설 키가 전달되었으면 사용하세요: `$ARGUMENTS`

사용자에게 다음 정보를 질문하세요 (인자로 가설 키가 이미 전달된 경우 1번은 건너뛰세요):
1. 가설 키 (snake_case, 예: `emotional_granularity`)
2. 한국어 이름 (예: "감정 세분화가 자기조절을 돕는다")
3. PubMed 검색 쿼리 (OR로 연결된 키워드들)
4. 분류용 키워드 목록 (영어, 8-10개)
5. MeSH 용어 목록 (영어, 8-10개)
6. 가설 상세 설명 (한국어): description, theory, keyReferences (4개), emovaConnection

정보를 받으면, 아래 **8개 파일을 모두** 수정하세요. 하나라도 빠지면 Zod 스키마와 타입이 불일치합니다.

## 수정 파일 체크리스트

### 1. `src/types.ts`
`Hypothesis` union 타입에 새 값 추가:
```ts
export type Hypothesis =
  | "emotion_as_information"
  | "small_actions_self_efficacy"
  | "reflection_pattern_recognition"
  | "새_가설_키";
```

### 2. `src/lib/pubmed.ts`
세 곳에 추가:
- `HYPOTHESIS_QUERIES` — PubMed 검색 쿼리
- `HYPOTHESIS_KEYWORDS` — 키워드 분류용
- `HYPOTHESIS_MESH_TERMS` — MeSH 분류용

### 3. `src/tools/search-papers.ts`
`z.enum()` 배열에 새 가설 키 추가.

### 4. `src/tools/classify-paper.ts`
`HYPOTHESIS_KEYWORD_DETAILS` Record에 새 가설 키워드 추가. classify-paper는 pubmed.ts의 HYPOTHESIS_KEYWORDS와 별도로 더 넓은 키워드 목록을 가질 수 있음.

### 5. `src/resources/hypotheses.ts`
`HYPOTHESES` Record에 새 항목 추가:
```ts
새_가설_키: {
  name: "한국어 이름",
  description: "...",
  theory: "...",
  keyReferences: ["...", "...", "...", "..."],
  emovaConnection: "...",
},
```

### 6. `src/prompts/emova-prompts.ts`
`search-for-hypothesis` 프롬프트의 `z.enum()` 배열에 새 가설 키 추가.

### 7. `src/lib/__tests__/pubmed.test.ts`
다음 테스트 추가:
- `classifyByKeywords` — 새 가설 키워드 매칭 테스트
- `classifyByMeshTerms` — 새 가설 MeSH 매칭 테스트

### 8. 빌드 & 테스트

모든 수정 완료 후 반드시 실행:
```bash
npm test && npm run build
```

## 주의사항
- `z.enum()` 배열의 순서는 `types.ts`의 Hypothesis union 순서와 일치시키세요.
- 모든 사용자 대면 문자열은 한국어로 작성하세요.
- 키워드/MeSH 용어는 영어로 작성하세요 (PubMed는 영어 기반).
- import 경로에 `.js` 확장자를 잊지 마세요.
