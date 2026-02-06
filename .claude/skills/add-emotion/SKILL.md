---
name: add-emotion
description: 새 감정 카테고리를 Emova MCP 서버의 refine-task 도구에 추가합니다.
argument-hint: "[emotion-name]"
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

새 감정 카테고리를 Emova MCP 서버의 refine-task 도구에 추가합니다.

인자로 감정명이 전달되었으면 사용하세요: `$ARGUMENTS`

사용자에게 다음 정보를 질문하세요 (인자로 감정명이 이미 전달된 경우 1번은 건너뛰세요):
1. 한국어 감정명 (예: "분노")
2. 감정 패턴 키워드 6개 (한국어, 예: 분노, 화남, 짜증, 억울, 답답, 열받)
3. 제안할 micro-action 4개 (한국어, 구체적이고 작은 행동)
4. if-then 템플릿 (한국어, `만약 ... 하면, 먼저 ... 한다` 형식)
5. 심리학적 근거 rationale (한국어, 2-3문장)

정보를 받으면, 아래 파일들을 수정하세요.

## 수정 파일 체크리스트

### 1. `src/tools/refine-task.ts`
`EMOTION_ACTION_MAPPINGS` 배열에 새 항목 추가:
```ts
{
  emotionPatterns: ["분노", "화남", "짜증", "억울", "답답", "열받"],
  suggestedActions: [
    "액션 1",
    "액션 2",
    "액션 3",
    "액션 4",
  ],
  ifThenTemplate: "만약 ... 하면, 먼저 ... 한다",
  rationale: "심리학적 근거...",
},
```

### 2. `src/tools/__tests__/refine-task.test.ts`
다음 테스트 추가:
- 새 감정 대표 키워드로 `findBestMapping()` 호출 시 올바른 매핑 반환 확인
- 새 감정 변형 키워드로도 매핑되는지 확인

예시:
```ts
it("분노 감정에 대해 분노 매핑을 반환한다", () => {
  const mapping = findBestMapping("분노가 치밀어요");
  expect(mapping.emotionPatterns).toContain("분노");
  expect(mapping.suggestedActions.length).toBeGreaterThan(0);
});

it("짜증 감정에 대해 분노 매핑을 반환한다", () => {
  const mapping = findBestMapping("짜증나요");
  expect(mapping.emotionPatterns).toContain("짜증");
});
```

### 3. 빌드 & 테스트

모든 수정 완료 후 반드시 실행:
```bash
npm test && npm run build
```

## 주의사항
- `EMOTION_ACTION_MAPPINGS` 배열에서의 순서가 중요: `findBestMapping()`은 첫 번째 매칭을 반환하므로, 더 구체적인 감정을 위에 배치하세요.
- 패턴 키워드는 `includes()` 매칭이므로, "화" 같은 너무 짧은 키워드는 오탐을 일으킬 수 있습니다. 최소 2글자 이상 권장.
- micro-action은 5분 이내에 완수 가능한 수준으로 작성하세요.
- rationale은 근거 이론을 명시하고, 왜 이 행동이 해당 감정에 효과적인지 설명하세요.
- 모든 문자열은 한국어로 작성하세요.
