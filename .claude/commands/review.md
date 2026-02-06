Emova MCP 서버 코드에 대한 셀프 코드 리뷰를 수행합니다. 아래 체크리스트를 하나씩 확인하고, 각 항목의 통과/실패 여부를 보고하세요.

## 체크리스트

### 1. ES 모듈 import 확인
`src/` 디렉토리의 모든 `.ts` 파일에서 로컬 import (`.` 또는 `..`로 시작)에 `.js` 확장자가 있는지 확인하세요.
```
✅ import { Foo } from "../types.js"
❌ import { Foo } from "../types"
```

### 2. Zod 스키마 `.describe()` 확인
`src/tools/`와 `src/prompts/`의 모든 Zod 스키마 필드에 `.describe()`가 있는지 확인하세요. MCP 도구의 매개변수 설명으로 사용됩니다.

### 3. 사용자 대면 문자열 한국어 확인
도구 description, 에러 메시지, disclaimer, sensitivity_notes가 한국어로 작성되어 있는지 확인하세요. 변수명, 타입, 코드 내부 로직은 영어 OK.

### 4. Disclaimer 포함 확인
감정 관련 출력을 하는 도구(`refine_ambiguous_task`, `classify_paper_for_emova`, `search_emova_papers`)의 응답에 disclaimer가 포함되어 있는지 확인하세요.

### 5. 에러 핸들링 패턴 확인
`src/tools/`의 에러 반환이 `{ isError: true }` 플래그와 한국어 메시지를 포함하는지 확인하세요.

### 6. TypeScript 타입 ↔ Zod enum 일치 확인
`src/types.ts`의 `Hypothesis` union과 다음 파일의 `z.enum()` 배열이 동일한 값을 포함하는지 비교하세요:
- `src/tools/search-papers.ts`
- `src/prompts/emova-prompts.ts`

`src/types.ts`의 `Population` union과 `src/tools/search-papers.ts`의 population `z.enum()`도 비교하세요.

### 7. console.log 사용 확인
`src/` 디렉토리에서 `console.log`가 사용되지 않는지 확인하세요. stdio 서버에서는 `console.error`만 사용해야 합니다.

### 8. 린트, 테스트, 빌드

```bash
npm run lint && npm test && npm run build
```

모두 통과하면 ✅, 실패 시 원인을 보고하세요.

## 결과 형식

```
## 코드 리뷰 결과

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | ES 모듈 import .js | ✅/❌ | ... |
| 2 | Zod .describe() | ✅/❌ | ... |
| 3 | 한국어 문자열 | ✅/❌ | ... |
| 4 | Disclaimer | ✅/❌ | ... |
| 5 | 에러 핸들링 | ✅/❌ | ... |
| 6 | 타입↔Zod 일치 | ✅/❌ | ... |
| 7 | console.log 없음 | ✅/❌ | ... |
| 8 | lint/test/build | ✅/❌ | ... |
```

실패 항목이 있으면 수정안을 제안하세요.
