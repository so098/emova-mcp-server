# classify_paper_for_emova

특정 논문(DOI 또는 초록)이 Emova의 어떤 가설을 지지하는지 키워드 + MeSH 기반으로 분류합니다.

## 데이터 흐름

DOI가 입력된 경우:

```
MCP Client                MCP Server                   PubMed (NCBI)
    │                         │                             │
    │  ① tool call (JSON)     │                             │
    │ ───────────────────────→ │                             │
    │                         │  ② ESearch: DOI→PMID (JSON) │
    │                         │ ───────────────────────────→ │
    │                         │  ③ PMID (JSON)              │
    │                         │ ←─────────────────────────── │
    │                         │  ④ EFetch: 상세정보 (XML)    │
    │                         │ ───────────────────────────→ │
    │                         │  ⑤ 제목+초록+MeSH (XML)      │
    │                         │ ←─────────────────────────── │
    │                         │  ⑥ 키워드+MeSH 분류 (로컬)   │
    │  ⑦ tool result (JSON)   │                             │
    │ ←─────────────────────── │                             │
```

초록 텍스트만 입력된 경우:

```
MCP Client                MCP Server
    │                         │
    │  ① tool call (JSON)     │
    │ ───────────────────────→ │
    │                         │  ② 키워드 분류 (로컬)
    │  ③ tool result (JSON)   │
    │ ←─────────────────────── │
```

---

## 1. MCP 도구 인터페이스 (클라이언트 ↔ 이 서버)

이 섹션만으로 MCP 클라이언트에서 도구를 호출할 수 있습니다.

### Request — DOI로 분류

```json
{
  "name": "classify_paper_for_emova",
  "arguments": {
    "doi": "10.1007/s10865-024-00001-x"
  }
}
```

### Request — 초록 텍스트로 분류

```json
{
  "name": "classify_paper_for_emova",
  "arguments": {
    "abstract_text": "This study examines the combined effects of implementation intentions and self-efficacy on health behavior change among adults. Participants who formed specific if-then plans showed significantly higher goal attainment rates."
  }
}
```

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `doi` | `string` | No* | 논문 DOI (PubMed에서 초록 + MeSH를 가져옴) |
| `abstract_text` | `string` | No* | 논문 초록 텍스트 (DOI가 없을 경우 직접 입력) |

> *`doi` 또는 `abstract_text` 중 하나는 반드시 제공해야 합니다. DOI를 제공하면 MeSH 기반 분류도 함께 수행되므로 더 정확합니다.

### Response — DOI 입력 시 (성공)

```json
{
  "pmid": "38456789",
  "title": "Implementation intentions and self-efficacy in health behavior change",
  "doi": "10.1007/s10865-024-00001-x",
  "meshTerms": ["Self Efficacy", "Intention", "Health Behavior", "Humans"],
  "hypothesisTags": ["small_actions_self_efficacy"],
  "classification": {
    "emotion_as_information": {
      "matched": false,
      "matchedKeywords": [],
      "matchedMeshTerms": [],
      "supportingSentences": []
    },
    "small_actions_self_efficacy": {
      "matched": true,
      "matchedKeywords": ["self-efficacy", "implementation intention", "behavior change", "goal setting"],
      "matchedMeshTerms": ["Self Efficacy", "Intention", "Health Behavior"],
      "supportingSentences": [
        "This study examines the combined effects of implementation intentions and self-efficacy on health behavior change among adults.",
        "Participants who formed specific if-then plans showed significantly higher goal attainment rates compared to controls.",
        "Self-efficacy mediated the relationship between implementation intentions and sustained behavior change over 12 weeks."
      ]
    },
    "reflection_pattern_recognition": {
      "matched": false,
      "matchedKeywords": [],
      "matchedMeshTerms": [],
      "supportingSentences": []
    }
  },
  "note": "이 분류는 키워드 + MeSH 용어 기반 자동 분류이며, 전문가 리뷰를 대체하지 않습니다."
}
```

### Response — 초록 텍스트만 입력 시

DOI가 없으면 PubMed를 호출하지 않으므로 `pmid`, `meshTerms` 필드가 없고, MeSH 기반 분류는 수행되지 않습니다:

```json
{
  "hypothesisTags": ["small_actions_self_efficacy"],
  "classification": {
    "small_actions_self_efficacy": {
      "matched": true,
      "matchedKeywords": ["self-efficacy", "implementation intention"],
      "matchedMeshTerms": [],
      "supportingSentences": ["..."]
    }
  },
  "note": "이 분류는 키워드 + MeSH 용어 기반 자동 분류이며, 전문가 리뷰를 대체하지 않습니다."
}
```

### Error Response

```json
// doi, abstract_text 모두 없을 때
{ "text": "doi 또는 abstract_text 중 하나를 반드시 입력해야 합니다.", "isError": true }

// DOI로 초록을 가져올 수 없을 때
{ "text": "초록 텍스트를 가져올 수 없습니다. DOI를 확인하거나 abstract_text를 직접 입력해주세요.", "isError": true }

// API 호출 실패 시
{ "text": "논문 분류 중 오류가 발생했습니다: PubMed efetch failed: 503 Service Unavailable", "isError": true }
```

---

## 2. 내부 처리 로직 (이 서버 내부)

**코드 위치:** `src/tools/classify-paper.ts`, `src/lib/pubmed.ts`

### 분류 메커니즘

분류는 세 단계로 이루어집니다:

#### 2-1. 키워드 매칭

제목 + 초록 텍스트에서 가설별 키워드를 검색합니다.

**코드 위치:** `src/lib/pubmed.ts` — `classifyByKeywords()`, `src/tools/classify-paper.ts` — `HYPOTHESIS_KEYWORD_DETAILS`

| 가설 | 키워드 |
|------|--------|
| `emotion_as_information` | affect, emotion regulation, emotional information, appraisal, action tendency, affect as information, emotion decision, emotional processing, mood, feeling, valence |
| `small_actions_self_efficacy` | self-efficacy, mastery, small steps, micro, implementation intention, goal setting, behavior change, self-regulation, incremental, graded task |
| `reflection_pattern_recognition` | self-monitoring, reflection, diary, journaling, pattern, self-awareness, metacognition, reflective practice, self-observation, tracking |

#### 2-2. MeSH 용어 매칭

PubMed에서 가져온 MeSH 용어를 가설별 대상 MeSH와 대조합니다. 상세한 MeSH 매핑은 [mesh-classification.md](../mesh-classification.md)를 참고하세요.

#### 2-3. 결합 분류

**코드 위치:** `src/lib/pubmed.ts` — `classifyCombined()`

키워드 태그와 MeSH 태그를 합산하고 중복을 제거합니다:

```
최종 태그 = Set(키워드 매칭 결과 ∪ MeSH 매칭 결과)
```

---

## 3. 외부 API 상세 (이 서버 → PubMed)

DOI가 입력된 경우 PubMed E-utilities를 호출하여 논문 정보를 가져옵니다. 초록만 입력된 경우 외부 API 호출 없이 로컬에서 분류합니다.

### 3-1. ESearch — DOI → PMID 변환

DOI를 PubMed 검색 쿼리로 변환하여 PMID를 찾습니다.

**Endpoint:**
```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
```

**코드 위치:** `src/lib/pubmed.ts` — `searchByDoi()`

**파라미터:**

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `db` | `"pubmed"` | 검색 대상 데이터베이스 |
| `term` | `{DOI}[doi]` | `[doi]` 필드 태그로 DOI 직접 검색 |
| `retmax` | `"1"` | 최대 1건 반환 |
| `retmode` | `"json"` | 응답 형식 |
| `api_key` | 환경변수 (선택) | NCBI API 키 |

**curl 예시:**

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?\
db=pubmed&\
term=10.1007/s10865-024-00001-x[doi]&\
retmax=1&\
retmode=json"
```

**Response 예시:**

```json
{
  "esearchresult": {
    "count": "1",
    "retmax": "1",
    "idlist": ["38456789"]
  }
}
```

### 3-2. EFetch — PMID → 논문 상세 정보

찾은 PMID로 논문의 제목, 초록, MeSH 등을 가져옵니다.

**Endpoint:**
```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
```

**코드 위치:** `src/lib/pubmed.ts` — `fetchPaperDetails()`

**파라미터:**

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `db` | `"pubmed"` | 데이터베이스 |
| `id` | `"38456789"` | PMID |
| `retmode` | `"xml"` | XML 형식으로 반환 |
| `api_key` | 환경변수 (선택) | NCBI API 키 |

**curl 예시:**

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?\
db=pubmed&\
id=38456789&\
retmode=xml"
```

**Response에서 추출하는 데이터:**

```xml
<!-- 제목 -->
<ArticleTitle>Implementation intentions and self-efficacy...</ArticleTitle>

<!-- 초록 -->
<Abstract>
  <AbstractText>This study examines the combined effects...</AbstractText>
</Abstract>

<!-- MeSH 용어 (분류에 핵심 역할) -->
<MeshHeadingList>
  <MeshHeading>
    <DescriptorName UI="D020377" MajorTopicYN="Y">Self Efficacy</DescriptorName>
  </MeshHeading>
  <MeshHeading>
    <DescriptorName UI="D033182" MajorTopicYN="Y">Intention</DescriptorName>
  </MeshHeading>
</MeshHeadingList>
```

### 공식 문서 링크

- [ESearch 레퍼런스](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESearch)
- [EFetch 레퍼런스](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EFetch)
- [PubMed 필드 태그 - DOI 검색](https://pubmed.ncbi.nlm.nih.gov/help/#doi-tag)
- [MEDLINE/PubMed XML Element Descriptions](https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html)
- [Introduction to MeSH](https://www.nlm.nih.gov/mesh/introduction.html) — MeSH가 무엇인지
- [Use of MeSH in Indexing](https://www.nlm.nih.gov/mesh/intro_indexing.html) — 논문에 MeSH가 어떻게 부여되는지
- [MeSH Browser](https://meshb.nlm.nih.gov/) — 개별 MeSH 용어 검색

### Rate Limit 및 API Key

- **Rate Limit:** API 키 없이 초당 3회, API 키 사용 시 초당 10회
- **API Key 발급:** [NCBI API Key 안내](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/)
- **NCBI Usage Policy:** [E-utilities Usage Guidelines](https://www.ncbi.nlm.nih.gov/books/NBK25497/)
- **DOI가 PubMed에 없는 경우:** DOI가 PubMed에 등재되지 않은 논문이면 PMID를 찾을 수 없으므로, `abstract_text`를 직접 입력해야 합니다 (이 경우 MeSH 분류 불가)

---

## 4. 이론적 근거

분류 기준이 되는 세 가지 가설의 근거 논문:

### emotion_as_information — Affect-as-Information 이론

| 논문 | 검증 링크 |
|------|-----------|
| Schwarz, N. (2012). Feelings-as-information theory. *Handbook of theories of social psychology.* | [Google Scholar](https://scholar.google.com/scholar?q=Schwarz+feelings+as+information+theory+2012) |
| Clore, G. L., & Huntsinger, J. R. (2007). How emotions inform judgment and regulate thought. *Trends in Cognitive Sciences.* | [PubMed: 17548233](https://pubmed.ncbi.nlm.nih.gov/17548233/) |
| Frijda, N. H. (1986). *The Emotions.* Cambridge University Press. | [Google Scholar](https://scholar.google.com/scholar?q=Frijda+The+Emotions+1986+Cambridge) |

### small_actions_self_efficacy — 자기효능감 + Implementation Intentions

| 논문 | 검증 링크 |
|------|-----------|
| Bandura, A. (1997). *Self-Efficacy: The Exercise of Control.* | [Google Scholar](https://scholar.google.com/scholar?q=Bandura+Self-Efficacy+Exercise+of+Control+1997) |
| Gollwitzer, P. M. (1999). Implementation intentions. *American Psychologist.* | [PubMed: 10589297](https://pubmed.ncbi.nlm.nih.gov/10589297/) |
| Gollwitzer & Sheeran (2006). Implementation intentions and goal achievement: A meta-analysis. | [Google Scholar](https://scholar.google.com/scholar?q=Gollwitzer+Sheeran+implementation+intentions+meta-analysis+2006) |

### reflection_pattern_recognition — 회고 및 메타인지

| 논문 | 검증 링크 |
|------|-----------|
| Pennebaker, J. W. (1997). Writing about emotional experiences as a therapeutic process. | [Google Scholar](https://scholar.google.com/scholar?q=Pennebaker+writing+emotional+experiences+therapeutic+1997) |
| Gross, J. J. (2015). Emotion regulation: Current status and future prospects. | [PubMed: 26171108](https://pubmed.ncbi.nlm.nih.gov/26171108/) |
| Koole, S. L. (2009). The psychology of emotion regulation: An integrative review. | [Google Scholar](https://scholar.google.com/scholar?q=Koole+psychology+emotion+regulation+integrative+review+2009) |
