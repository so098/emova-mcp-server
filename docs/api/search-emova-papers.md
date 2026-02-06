# search_emova_papers

Emova의 세 가지 가설과 관련된 심리학 논문을 PubMed에서 검색합니다.

## 데이터 흐름

```
MCP Client                MCP Server                   PubMed (NCBI)
    │                         │                             │
    │  ① tool call (JSON)     │                             │
    │ ───────────────────────→ │                             │
    │                         │  ② ESearch (JSON)           │
    │                         │ ───────────────────────────→ │
    │                         │  ③ PMID 목록 (JSON)         │
    │                         │ ←─────────────────────────── │
    │                         │  ④ EFetch (XML)             │
    │                         │ ───────────────────────────→ │
    │                         │  ⑤ 논문 메타데이터 (XML)      │
    │                         │ ←─────────────────────────── │
    │  ⑥ tool result (JSON)   │                             │
    │ ←─────────────────────── │                             │
```

---

## 1. MCP 도구 인터페이스 (클라이언트 ↔ 이 서버)

이 섹션만으로 MCP 클라이언트에서 도구를 호출할 수 있습니다.

### Request (MCP tool call)

```json
{
  "name": "search_emova_papers",
  "arguments": {
    "hypothesis": "small_actions_self_efficacy",
    "query": "goal setting intervention",
    "year_from": 2020,
    "year_to": 2024,
    "max_results": 5,
    "population": "general"
  }
}
```

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `hypothesis` | `enum` | Yes | `emotion_as_information` \| `small_actions_self_efficacy` \| `reflection_pattern_recognition` |
| `query` | `string` | Yes | 자유 텍스트 키워드 |
| `year_from` | `number` | No | 검색 시작 연도 |
| `year_to` | `number` | No | 검색 종료 연도 |
| `max_results` | `number` | No | 최대 결과 수 (기본: 10) |
| `population` | `enum` | No | `general` \| `adhd` \| `anxiety_disorder` \| `depression` \| `adhd_with_anxiety_or_depression` |

### Response — 성공

```json
{
  "hypothesis": "small_actions_self_efficacy",
  "query": "(\"self-efficacy\" OR \"micro-goals\" OR \"implementation intentions\" OR \"small steps behavior change\") AND (goal setting intervention)",
  "total": 2,
  "papers": [
    {
      "pmid": "38456789",
      "title": "Implementation intentions and self-efficacy in health behavior change",
      "authors": "Park JH, Lee SY",
      "journal": "Journal of Behavioral Medicine",
      "year": 2024,
      "doi": "10.1007/s10865-024-00001-x",
      "hypothesisTags": ["small_actions_self_efficacy"],
      "summary": "This study examines the combined effects of implementation intentions and self-efficacy on health behavior change among adults."
    }
  ],
  "note": "이 정보는 연구·교육·제품 설계 참고용이며, 진단이나 치료를 위한 것이 아닙니다."
}
```

### Response — 결과 없음

```json
{
  "message": "검색 결과가 없습니다. 다른 키워드나 필터를 시도해보세요.",
  "query": "(검색에 사용된 전체 쿼리)"
}
```

---

## 2. 내부 처리 로직 (이 서버 내부)

**코드 위치:** `src/tools/search-papers.ts`, `src/lib/pubmed.ts`

### 검색 쿼리 조합 방식

`search_emova_papers`는 가설별 사전 정의 쿼리 + 사용자 키워드를 조합합니다:

```
(가설별 기본 쿼리) AND (사용자 query) [AND 집단 필터]
```

가설별 기본 쿼리 (`HYPOTHESIS_QUERIES`):

| 가설 | 기본 검색 쿼리 |
|------|----------------|
| `emotion_as_information` | `"affect as information" OR "emotion action tendency" OR "emotion decision making"` |
| `small_actions_self_efficacy` | `"self-efficacy" OR "micro-goals" OR "implementation intentions" OR "small steps behavior change"` |
| `reflection_pattern_recognition` | `"emotional self-regulation" OR "self-monitoring emotion" OR "reflective practice" OR "emotion pattern recognition"` |

집단 필터 (`POPULATION_FILTERS`, 선택):

| population | 추가되는 필터 |
|------------|---------------|
| `adhd` | `AND "ADHD"` |
| `anxiety_disorder` | `AND "anxiety disorder"` |
| `depression` | `AND ("depression" OR "depressive disorder")` |
| `adhd_with_anxiety_or_depression` | `AND "ADHD" AND ("anxiety" OR "depression")` |

---

## 3. 외부 API 상세 (이 서버 → PubMed)

이 도구는 내부적으로 PubMed E-utilities의 **ESearch**와 **EFetch** 두 API를 순차 호출합니다.

### 3-1. ESearch — 논문 ID 검색

PubMed에서 검색어에 매칭되는 논문의 PMID(PubMed ID) 목록을 가져옵니다.

**Endpoint:**
```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
```

**코드 위치:** `src/lib/pubmed.ts` — `searchPubMed()`

**파라미터:**

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `db` | `"pubmed"` | 검색 대상 데이터베이스 |
| `term` | 조합된 검색 쿼리 | 가설별 쿼리 + 사용자 키워드 + 집단 필터 |
| `retmax` | `"10"` (기본값) | 최대 반환 결과 수 |
| `retmode` | `"json"` | 응답 형식 |
| `mindate` | `"2020/01/01"` (선택) | 검색 시작 날짜 |
| `maxdate` | `"2024/12/31"` (선택) | 검색 종료 날짜 |
| `datetype` | `"pdat"` (선택) | 날짜 유형 (출판일 기준) |
| `api_key` | 환경변수 (선택) | NCBI API 키 |

**curl 예시:**

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?\
db=pubmed&\
term=(%22self-efficacy%22+OR+%22micro-goals%22+OR+%22implementation+intentions%22+OR+%22small+steps+behavior+change%22)+AND+(goal+setting+intervention)&\
retmax=5&\
retmode=json&\
mindate=2020/01/01&\
maxdate=2024/12/31&\
datetype=pdat"
```

**Response 예시:**

```json
{
  "esearchresult": {
    "count": "142",
    "retmax": "5",
    "retstart": "0",
    "idlist": [
      "38456789",
      "37123456",
      "36987654",
      "36543210",
      "35678901"
    ]
  }
}
```

코드에서 `esearchresult.idlist`만 추출하여 다음 단계로 전달합니다.

### 3-2. EFetch — 논문 상세 정보 조회

ESearch에서 받은 PMID들로 논문 메타데이터(제목, 저자, 초록, MeSH 등)를 가져옵니다.

**Endpoint:**
```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
```

**코드 위치:** `src/lib/pubmed.ts` — `fetchPaperDetails()`

**파라미터:**

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `db` | `"pubmed"` | 데이터베이스 |
| `id` | `"38456789,37123456,..."` | 쉼표로 구분된 PMID 목록 |
| `retmode` | `"xml"` | XML 형식으로 반환 |
| `api_key` | 환경변수 (선택) | NCBI API 키 |

**curl 예시:**

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?\
db=pubmed&\
id=38456789,37123456&\
retmode=xml"
```

**Response 예시 (XML, 주요 부분):**

```xml
<?xml version="1.0" ?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2024//EN"
  "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_240101.dtd">
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="MEDLINE" Owner="NLM">
      <PMID Version="1">38456789</PMID>
      <Article PubModel="Electronic">
        <Journal>
          <Title>Journal of Behavioral Medicine</Title>
          <ISOAbbreviation>J Behav Med</ISOAbbreviation>
        </Journal>
        <ArticleTitle>Implementation intentions and self-efficacy in health behavior change: A randomized controlled trial</ArticleTitle>
        <Abstract>
          <AbstractText>This study examines the combined effects of implementation intentions and self-efficacy on health behavior change among adults. Participants who formed specific if-then plans showed significantly higher goal attainment rates compared to controls. Self-efficacy mediated the relationship between implementation intentions and sustained behavior change over 12 weeks.</AbstractText>
        </Abstract>
        <AuthorList CompleteYN="Y">
          <Author ValidYN="Y">
            <LastName>Park</LastName>
            <Initials>JH</Initials>
          </Author>
          <Author ValidYN="Y">
            <LastName>Lee</LastName>
            <Initials>SY</Initials>
          </Author>
        </AuthorList>
      </Article>
      <MeshHeadingList>
        <MeshHeading>
          <DescriptorName UI="D020377" MajorTopicYN="Y">Self Efficacy</DescriptorName>
        </MeshHeading>
        <MeshHeading>
          <DescriptorName UI="D033182" MajorTopicYN="Y">Intention</DescriptorName>
        </MeshHeading>
        <MeshHeading>
          <DescriptorName UI="D015438" MajorTopicYN="N">Health Behavior</DescriptorName>
        </MeshHeading>
        <MeshHeading>
          <DescriptorName UI="D006801" MajorTopicYN="N">Humans</DescriptorName>
        </MeshHeading>
      </MeshHeadingList>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">38456789</ArticleId>
        <ArticleId IdType="doi">10.1007/s10865-024-00001-x</ArticleId>
      </ArticleIdList>
      <History>
        <PubMedPubDate PubStatus="pubmed">
          <Year>2024</Year>
          <Month>3</Month>
          <Day>15</Day>
        </PubMedPubDate>
      </History>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>
```

### XML 파싱 매핑 테이블

| XML 요소 | 추출 대상 | `PaperMetadata` 필드 |
|-----------|-----------|---------------------|
| `<PMID>` | 논문 고유 ID | `pmid` |
| `<ArticleTitle>` | 제목 | `title` |
| `<Author>` → `<LastName>`, `<Initials>` | 저자 목록 | `authors` |
| `<Title>` (Journal) | 저널명 | `journal` |
| `<PubDate>` → `<Year>` | 출판 연도 | `year` |
| `<ArticleId IdType="doi">` | DOI | `doi` |
| `<AbstractText>` | 초록 | `abstract` |
| `<DescriptorName>` | MeSH 용어 | `meshTerms` |

### 공식 문서 링크

- [ESearch 레퍼런스](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESearch) — NCBI E-utilities 공식 문서의 ESearch 섹션
- [EFetch 레퍼런스](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EFetch) — NCBI E-utilities 공식 문서의 EFetch 섹션
- [E-utilities Quick Start](https://www.ncbi.nlm.nih.gov/books/NBK25500/) — E-utilities 입문 가이드
- [Entrez Programming Utilities Help](https://www.ncbi.nlm.nih.gov/books/NBK25501/) — E-utilities 전체 도움말
- [efetch - NLM Data Guide](https://dataguide.nlm.nih.gov/edirect/efetch.html) — efetch 사용 가이드
- [MEDLINE/PubMed XML Element Descriptions](https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html) — 반환되는 XML의 모든 요소 설명
- [PubMed 검색 구문](https://pubmed.ncbi.nlm.nih.gov/help/#search-tags) — 필드 태그, 불리언 연산자, 날짜 필터 등
- [PubMed DTD](https://dtd.nlm.nih.gov/ncbi/pubmed/doc/out/250101/index.html) — PubMed XML 전체 요소 정의

### Rate Limit 및 API Key

- **Rate Limit:** API 키 없이 초당 3회, API 키 사용 시 초당 10회
- **API Key 발급:** [NCBI API Key 안내](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/)
- **NCBI Usage Policy:** [E-utilities Usage Guidelines](https://www.ncbi.nlm.nih.gov/books/NBK25497/) — 대량 요청 시 반드시 API 키 사용, `tool` 및 `email` 파라미터 권장

---

## 4. 이론적 근거

이 도구의 검색 쿼리는 다음 이론들에 기반하여 설계되었습니다:

### emotion_as_information

| 이론/논문 | 검증 링크 |
|-----------|-----------|
| Schwarz, N. (2012). Feelings-as-information theory. *Handbook of theories of social psychology.* | [Google Scholar](https://scholar.google.com/scholar?q=Schwarz+feelings+as+information+theory+2012) |
| Clore, G. L., & Huntsinger, J. R. (2007). How emotions inform judgment and regulate thought. *Trends in Cognitive Sciences.* | [PubMed: 17548233](https://pubmed.ncbi.nlm.nih.gov/17548233/) |
| Lerner, J. S., et al. (2015). Emotion and decision making. *Annual Review of Psychology.* | [PubMed: 25251484](https://pubmed.ncbi.nlm.nih.gov/25251484/) |

### small_actions_self_efficacy

| 이론/논문 | 검증 링크 |
|-----------|-----------|
| Bandura, A. (1997). *Self-Efficacy: The Exercise of Control.* W.H. Freeman. | [Google Scholar](https://scholar.google.com/scholar?q=Bandura+Self-Efficacy+Exercise+of+Control+1997) |
| Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. *American Psychologist.* | [PubMed: 10589297](https://pubmed.ncbi.nlm.nih.gov/10589297/) |
| Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis. *Advances in Experimental Social Psychology.* | [Google Scholar](https://scholar.google.com/scholar?q=Gollwitzer+Sheeran+implementation+intentions+meta-analysis+2006) |

### reflection_pattern_recognition

| 이론/논문 | 검증 링크 |
|-----------|-----------|
| Pennebaker, J. W. (1997). Writing about emotional experiences as a therapeutic process. *Psychological Science.* | [Google Scholar](https://scholar.google.com/scholar?q=Pennebaker+writing+emotional+experiences+therapeutic+1997) |
| Gross, J. J. (2015). Emotion regulation: Current status and future prospects. *Psychological Inquiry.* | [PubMed: 26171108](https://pubmed.ncbi.nlm.nih.gov/26171108/) |
| Flavell, J. H. (1979). Metacognition and cognitive monitoring. *American Psychologist.* | [Google Scholar](https://scholar.google.com/scholar?q=Flavell+metacognition+cognitive+monitoring+1979) |
