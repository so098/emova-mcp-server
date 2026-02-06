# PubMed API 호출 흐름

## 전체 흐름 요약

```
사용자 요청
    │
    ▼
search_emova_papers 도구 호출
    │
    ▼
┌─────────────────────────────┐
│ 1단계: esearch              │
│ 검색어 → PMID 목록 (JSON)   │
│ GET eutils/esearch.fcgi     │
└──────────┬──────────────────┘
           │ PMID 배열 (예: ["38123456", "38123457"])
           ▼
┌─────────────────────────────┐
│ 2단계: efetch               │
│ PMID → 논문 상세 정보 (XML) │
│ GET eutils/efetch.fcgi      │
└──────────┬──────────────────┘
           │ XML 파싱
           ▼
┌─────────────────────────────┐
│ 3단계: 분류                 │
│ 키워드 + MeSH → 가설 태그   │
└──────────┬──────────────────┘
           │ PaperMetadata[]
           ▼
    JSON 결과 반환
```

## PubMed E-utilities 2단계 호출

PubMed API는 **E-utilities**라는 RESTful 인터페이스를 제공한다. 이 프로젝트에서는 2가지 엔드포인트를 사용한다.

### 1단계: `esearch` — 검색어 → PMID 목록

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
  ?db=pubmed
  &term=검색어
  &retmax=10
  &retmode=json
  &api_key=...
```

- **입력**: 검색 쿼리 문자열 (Boolean 조합 가능)
- **출력**: JSON 형태의 PMID(PubMed ID) 목록
- **응답 예시**: `{ "esearchresult": { "idlist": ["38123456", "38123457"] } }`

### 2단계: `efetch` — PMID → 논문 상세 XML

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
  ?db=pubmed
  &id=38123456,38123457
  &retmode=xml
  &api_key=...
```

- **입력**: 쉼표로 구분된 PMID 목록
- **출력**: PubmedArticleSet XML (제목, 저자, 초록, MeSH 용어 등 포함)

## 주요 함수 (`src/lib/pubmed.ts`)

### `searchPubMed(query, options)` → `string[]`

esearch API를 호출하여 PMID 배열을 반환한다.

```typescript
export async function searchPubMed(
  query: string,
  options: SearchOptions = {}  // { yearFrom?, yearTo?, maxResults? }
): Promise<string[]>
```

- `yearFrom`/`yearTo`가 있으면 `mindate`/`maxdate` 파라미터로 날짜 필터 적용
- `maxResults` 기본값 10
- `buildApiParams()`를 통해 `NCBI_API_KEY` 환경변수가 있으면 자동으로 `api_key` 파라미터 추가

### `fetchPaperDetails(pmids)` → `PaperMetadata[]`

efetch API로 XML을 받아온 뒤, `parseArticlesFromXml()`로 파싱하여 구조화된 메타데이터 배열을 반환한다.

```typescript
export async function fetchPaperDetails(
  pmids: string[]
): Promise<PaperMetadata[]>
```

### `parseArticlesFromXml(xml)` → `PaperMetadata[]`

XML 문자열에서 각 `<PubmedArticle>` 블록을 정규식으로 추출하고, 필드별로 파싱한다.

추출하는 필드:

| 필드 | XML 태그 | 추출 방식 |
|------|----------|-----------|
| `pmid` | `<PMID>` | 정규식 `/<PMID[^>]*>(\d+)<\/PMID>/` |
| `title` | `<ArticleTitle>` | `extractTagContent()` |
| `authors` | `<Author>` 내 `<LastName>`, `<Initials>` | 반복 정규식 |
| `journal` | `<Title>` 또는 `<ISOAbbreviation>` | `extractTagContent()` |
| `year` | `<PubDate>` 내 `<Year>` | 정규식 + parseInt |
| `doi` | `<ArticleId IdType="doi">` | 정규식 |
| `abstract` | `<Abstract>` 내 `<AbstractText>` | 반복 정규식, 여러 섹션 합침 |
| `meshTerms` | `<DescriptorName>` | `parseMeshTerms()` |
| `hypothesisTags` | *(파생)* | `classifyCombined(title + abstract, meshTerms)` |
| `summary` | *(파생)* | 초록의 첫 문장, 없으면 제목 사용 |

### `extractTagContent(xml, tag)` — 헬퍼 함수

```typescript
function extractTagContent(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}
```

태그 내부의 텍스트를 추출하되, 중첩된 HTML 태그는 제거한다. DOM 파서 없이 정규식만으로 경량 처리하는 방식.

**왜 DOM 파서를 안 쓰는가?**
- MCP 서버는 가볍게 유지해야 하므로 `xml2js`, `fast-xml-parser` 같은 의존성 추가를 피함
- PubMed XML 구조가 비교적 일관적이라, 정규식으로 필요한 필드만 추출하는 것으로 충분

## 논문 분류 로직

논문이 Emova의 3가지 가설 중 어디에 해당하는지 자동 분류하는 시스템.

### 3가지 분류 함수

```
classifyCombined(text, meshTerms)
    ├── classifyByKeywords(text)       ← 제목+초록의 키워드 매칭
    └── classifyByMeshTerms(meshTerms) ← MeSH 용어 매칭
```

### `classifyByKeywords(text)` → `Hypothesis[]`

텍스트(제목+초록)를 소문자로 변환한 뒤, `HYPOTHESIS_KEYWORDS`의 각 키워드가 포함되어 있는지 검사한다.

```typescript
const HYPOTHESIS_KEYWORDS: Record<Hypothesis, string[]> = {
  emotion_as_information: [
    "affect", "emotion regulation", "emotional information",
    "appraisal", "action tendency", "affect as information",
    "emotion decision", "emotional processing",
  ],
  small_actions_self_efficacy: [
    "self-efficacy", "mastery", "small steps", "micro",
    "implementation intention", "goal setting",
    "behavior change", "self-regulation",
  ],
  reflection_pattern_recognition: [
    "self-monitoring", "reflection", "diary", "journaling",
    "pattern", "self-awareness", "metacognition",
    "reflective practice",
  ],
};
```

**매칭 방식**: 가설별 키워드 중 하나라도 텍스트에 포함되면(`lowerText.includes(kw)`) 해당 가설에 태그.

### `classifyByMeshTerms(meshTerms)` → `Hypothesis[]`

PubMed가 부여한 MeSH(Medical Subject Headings) 용어와 사전 정의된 가설별 MeSH 용어를 매칭한다.

```typescript
export const HYPOTHESIS_MESH_TERMS: Record<Hypothesis, string[]> = {
  emotion_as_information: [
    "Emotions", "Affect", "Emotional Regulation", "Decision Making",
    "Judgment", "Mood Disorders", "Affective Symptoms",
    "Emotional Intelligence", "Appraisal",
  ],
  small_actions_self_efficacy: [
    "Self Efficacy", "Goals", "Intention", "Behavior Therapy",
    "Motivation", "Task Performance and Analysis",
    "Health Behavior", "Habits", "Self-Management",
  ],
  reflection_pattern_recognition: [
    "Self-Assessment", "Metacognition", "Writing", "Self Report",
    "Awareness", "Diaries as Topic", "Mindfulness",
    "Self Concept", "Cognitive Behavioral Therapy",
  ],
};
```

**MeSH 용어란?** PubMed의 전문 색인 담당자가 논문 내용을 분석해 부여하는 표준 의학 주제 분류. 키워드 매칭보다 정확도가 높다.

### `classifyCombined(text, meshTerms)` → `Hypothesis[]`

두 분류 결과를 `Set`으로 합산(union)하여 중복을 제거한다.

```typescript
export function classifyCombined(
  text: string, meshTerms: string[]
): Hypothesis[] {
  const keywordTags = classifyByKeywords(text);
  const meshTags = classifyByMeshTerms(meshTerms);
  const combined = new Set([...keywordTags, ...meshTags]);
  return [...combined];
}
```

하나의 논문이 여러 가설에 태그될 수 있다. 예를 들어, "자기효능감과 감정 조절의 관계"를 다룬 논문은 `emotion_as_information`과 `small_actions_self_efficacy` 모두에 태그될 수 있다.

## 검색 쿼리 구성

### `HYPOTHESIS_QUERIES` — 가설별 기본 검색어

```typescript
export const HYPOTHESIS_QUERIES: Record<Hypothesis, string> = {
  emotion_as_information:
    '"affect as information" OR "emotion action tendency" OR "emotion decision making"',
  small_actions_self_efficacy:
    '"self-efficacy" OR "micro-goals" OR "implementation intentions" OR "small steps behavior change"',
  reflection_pattern_recognition:
    '"emotional self-regulation" OR "self-monitoring emotion" OR "reflective practice" OR "emotion pattern recognition"',
};
```

도구 호출 시 **가설 기본 쿼리 + 사용자 키워드**를 AND로 결합한다:

```typescript
let searchQuery = `(${HYPOTHESIS_QUERIES[hypothesis]}) AND (${query})`;
```

### `POPULATION_FILTERS` — 대상 집단 필터

```typescript
export const POPULATION_FILTERS: Record<string, string> = {
  adhd: ' AND "ADHD"',
  anxiety_disorder: ' AND "anxiety disorder"',
  depression: ' AND ("depression" OR "depressive disorder")',
  adhd_with_anxiety_or_depression:
    ' AND "ADHD" AND ("anxiety" OR "depression")',
};
```

`population` 파라미터가 `"general"`이 아닌 경우 쿼리 뒤에 필터를 추가한다.

## API 키와 Rate Limit

```typescript
const API_KEY = process.env.NCBI_API_KEY || "";
```

| 조건 | Rate Limit |
|------|------------|
| API 키 **없음** | 초당 3회 요청 |
| API 키 **있음** | 초당 10회 요청 |

- API 키는 [NCBI 계정](https://www.ncbi.nlm.nih.gov/account/)에서 무료로 발급
- 환경변수 `NCBI_API_KEY`로 설정하면, `buildApiParams()`가 모든 요청에 자동 추가

```typescript
function buildApiParams(params: Record<string, string>): URLSearchParams {
  const searchParams = new URLSearchParams(params);
  if (API_KEY) {
    searchParams.set("api_key", API_KEY);
  }
  return searchParams;
}
```
