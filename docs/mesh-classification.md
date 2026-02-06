# MeSH 기반 논문 분류

## 배경

기존 분류 시스템은 논문 제목과 초록에서 키워드를 단순 매칭하는 방식이었습니다.
이 방식은 `"micro"`, `"mood"`, `"pattern"` 같은 범용 단어가 무관한 논문까지 매칭시키는 문제가 있었습니다.

이를 개선하기 위해 PubMed가 제공하는 **MeSH (Medical Subject Headings)** 용어를 분류에 활용하도록 변경했습니다.

## MeSH란?

MeSH는 미국 국립의학도서관(NLM)이 관리하는 약 30,000개 이상의 용어로 구성된 **통제 어휘(controlled vocabulary)** 체계입니다.
PubMed/MEDLINE에 등재되는 논문에 대해 인덱싱 과정에서 MeSH 태그가 부여됩니다.

> 2022년부터 NLM은 기존 수동 인덱싱에서 MTIX(Medical Text Indexer-NeXt Generation) 자동 알고리즘 기반 인덱싱으로 전환했으며, 일부는 이후 큐레이터가 검토합니다.

- PubMed에 등재된 대부분의 논문에 MeSH 태그가 부여됨
- 키워드 매칭과 달리 **논문의 실제 주제**를 반영
- 예: "self-efficacy"를 단순 언급하는 논문과 자기효능감을 핵심 주제로 다루는 논문을 구별 가능

**참고 링크:**
- [MeSH 공식 홈페이지](https://www.nlm.nih.gov/mesh/meshhome.html) — NLM MeSH 메인 페이지
- [Introduction to MeSH](https://www.nlm.nih.gov/mesh/introduction.html) — MeSH 개요 및 구조 설명
- [MeSH Browser](https://meshb.nlm.nih.gov/) — 개별 MeSH 용어를 검색하고 계층 구조를 확인할 수 있는 도구

### MeSH 인덱싱 과정

PubMed 논문에 MeSH가 어떻게 부여되는지에 대한 공식 문서:

- [Frequently Asked Questions about Indexing](https://www.nlm.nih.gov/bsd/indexfaq.html) — 인덱싱 FAQ, Automated vs. Curated 방식 설명
- [Use of MeSH in Indexing](https://www.nlm.nih.gov/mesh/intro_indexing.html) — MEDLINE 인덱싱에서 MeSH가 적용되는 방법
- [Incorporating Values for Indexing Method](https://www.nlm.nih.gov/pubs/techbull/ja18/ja18_indexing_method.html) — XML의 `IndexingMethod` 속성값 설명 (Automated / Curated)

### PubMed XML에서의 MeSH 구조

MeSH 용어는 PubMed efetch XML에서 다음 형태로 제공됩니다:

```xml
<MeshHeadingList>
  <MeshHeading>
    <DescriptorName UI="D012649" MajorTopicYN="Y">Self Efficacy</DescriptorName>
  </MeshHeading>
  <MeshHeading>
    <DescriptorName UI="D006801" MajorTopicYN="N">Humans</DescriptorName>
  </MeshHeading>
</MeshHeadingList>
```

`MajorTopicYN="Y"`는 해당 MeSH가 논문의 **주요 주제**임을 의미합니다.

**참고 링크:**
- [MEDLINE/PubMed XML Element Descriptions](https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html) — `MeshHeadingList`, `DescriptorName`, `MajorTopicYN` 등 모든 XML 요소 공식 레퍼런스
- [E-utilities In-Depth](https://www.ncbi.nlm.nih.gov/books/NBK25499/) — efetch 등 E-utilities API 파라미터 및 사용법
- [efetch - NLM Data Guide](https://dataguide.nlm.nih.gov/edirect/efetch.html) — efetch로 PubMed 레코드를 가져오는 방법
- [PubMed Help](https://pubmed.ncbi.nlm.nih.gov/help/) — PubMed 검색에서 MeSH가 어떻게 활용되는지 (Automatic Term Mapping 등)

## 변경된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/types.ts` | `PaperMetadata`에 `meshTerms: string[]` 필드 추가 |
| `src/lib/pubmed.ts` | MeSH 파싱, MeSH 분류, 복합 분류 함수 추가 |
| `src/tools/classify-paper.ts` | 분류 결과에 `matchedMeshTerms` 포함 |
| `src/lib/__tests__/pubmed.test.ts` | MeSH 관련 테스트 추가 |

## 추가된 함수 (pubmed.ts)

### `parseMeshTerms(articleXml: string): string[]`

PubMed XML에서 `<DescriptorName>` 태그를 추출합니다.

```typescript
parseMeshTerms('<DescriptorName UI="D012649">Self Efficacy</DescriptorName>')
// => ["Self Efficacy"]
```

### `classifyByMeshTerms(meshTerms: string[]): Hypothesis[]`

MeSH 용어 목록을 받아 Emova 가설에 매핑합니다.

```typescript
classifyByMeshTerms(["Self Efficacy", "Humans"])
// => ["small_actions_self_efficacy"]
```

### `classifyCombined(text: string, meshTerms: string[]): Hypothesis[]`

키워드 매칭과 MeSH 매칭 결과를 합산합니다 (중복 제거).
`parseArticlesFromXml()`과 `classify_paper_for_emova` 도구에서 사용됩니다.

```typescript
classifyCombined("This study examines affect", ["Self Efficacy"])
// => ["emotion_as_information", "small_actions_self_efficacy"]
```

## 가설별 MeSH 매핑 (`HYPOTHESIS_MESH_TERMS`)

각 MeSH 용어는 [MeSH Browser](https://meshb.nlm.nih.gov/)에서 검색하여 확인할 수 있습니다.

### emotion_as_information

| MeSH 용어 | MeSH Browser 링크 |
|-----------|-------------------|
| Emotions | [D004644](https://meshb.nlm.nih.gov/record/ui?ui=D004644) |
| Affect | [D000339](https://meshb.nlm.nih.gov/record/ui?ui=D000339) |
| Emotional Regulation | [D000080103](https://meshb.nlm.nih.gov/record/ui?ui=D000080103) |
| Decision Making | [D003657](https://meshb.nlm.nih.gov/record/ui?ui=D003657) |
| Judgment | [D007600](https://meshb.nlm.nih.gov/record/ui?ui=D007600) |
| Mood Disorders | [D019964](https://meshb.nlm.nih.gov/record/ui?ui=D019964) |
| Affective Symptoms | [D000342](https://meshb.nlm.nih.gov/record/ui?ui=D000342) |
| Emotional Intelligence | [D056348](https://meshb.nlm.nih.gov/record/ui?ui=D056348) |
| Appraisal | [D056348](https://meshb.nlm.nih.gov/record/ui?ui=D056348) |

### small_actions_self_efficacy

| MeSH 용어 | MeSH Browser 링크 |
|-----------|-------------------|
| Self Efficacy | [D020377](https://meshb.nlm.nih.gov/record/ui?ui=D020377) |
| Goals | [D006040](https://meshb.nlm.nih.gov/record/ui?ui=D006040) |
| Intention | [D033182](https://meshb.nlm.nih.gov/record/ui?ui=D033182) |
| Behavior Therapy | [D001521](https://meshb.nlm.nih.gov/record/ui?ui=D001521) |
| Motivation | [D009042](https://meshb.nlm.nih.gov/record/ui?ui=D009042) |
| Task Performance and Analysis | [D013647](https://meshb.nlm.nih.gov/record/ui?ui=D013647) |
| Health Behavior | [D015438](https://meshb.nlm.nih.gov/record/ui?ui=D015438) |
| Habits | [D006184](https://meshb.nlm.nih.gov/record/ui?ui=D006184) |
| Self-Management | [D000073278](https://meshb.nlm.nih.gov/record/ui?ui=D000073278) |

### reflection_pattern_recognition

| MeSH 용어 | MeSH Browser 링크 |
|-----------|-------------------|
| Self-Assessment | [D012647](https://meshb.nlm.nih.gov/record/ui?ui=D012647) |
| Metacognition | [D000079223](https://meshb.nlm.nih.gov/record/ui?ui=D000079223) |
| Writing | [D014956](https://meshb.nlm.nih.gov/record/ui?ui=D014956) |
| Self Report | [D057566](https://meshb.nlm.nih.gov/record/ui?ui=D057566) |
| Awareness | [D001364](https://meshb.nlm.nih.gov/record/ui?ui=D001364) |
| Mindfulness | [D064866](https://meshb.nlm.nih.gov/record/ui?ui=D064866) |
| Self Concept | [D012649](https://meshb.nlm.nih.gov/record/ui?ui=D012649) |
| Cognitive Behavioral Therapy | [D015928](https://meshb.nlm.nih.gov/record/ui?ui=D015928) |

## 분류 결과 예시

`classify_paper_for_emova` 도구의 반환값에 `matchedMeshTerms`가 추가되었습니다:

```json
{
  "pmid": "12345678",
  "title": "Self-efficacy and implementation intentions in health behavior",
  "meshTerms": ["Self Efficacy", "Intention", "Health Behavior", "Humans"],
  "hypothesisTags": ["small_actions_self_efficacy"],
  "classification": {
    "small_actions_self_efficacy": {
      "matched": true,
      "matchedKeywords": ["self-efficacy", "implementation intention"],
      "matchedMeshTerms": ["Self Efficacy", "Intention", "Health Behavior"],
      "supportingSentences": ["..."]
    },
    "emotion_as_information": {
      "matched": false,
      "matchedKeywords": [],
      "matchedMeshTerms": [],
      "supportingSentences": []
    }
  },
  "note": "이 분류는 키워드 + MeSH 용어 기반 자동 분류이며, 전문가 리뷰를 대체하지 않습니다."
}
```

## 한계

- **최신 논문에는 MeSH가 없을 수 있습니다.** MeSH 인덱싱은 논문 등재 후 수주~수개월이 소요됩니다. 2022년 이후 MTIX 자동 인덱싱 도입으로 속도가 개선되었지만, 완전히 즉시 부여되지는 않습니다. 이 경우 기존 키워드 매칭이 fallback으로 작동합니다. ([Indexing FAQ](https://www.nlm.nih.gov/bsd/indexfaq.html))
- **`MajorTopicYN` 속성을 아직 활용하지 않습니다.** `MajorTopicYN="Y"`는 해당 MeSH가 논문의 주요 주제임을 나타냅니다. 향후 주요 주제인 경우 가중치를 높이는 방식으로 정밀도를 더 개선할 수 있습니다. ([XML Element Descriptions](https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html))

## 참고 자료 모음

| 자료 | 링크 |
|------|------|
| MeSH 공식 홈페이지 | https://www.nlm.nih.gov/mesh/meshhome.html |
| Introduction to MeSH | https://www.nlm.nih.gov/mesh/introduction.html |
| MeSH Browser | https://meshb.nlm.nih.gov/ |
| MeSH 인덱싱 FAQ | https://www.nlm.nih.gov/bsd/indexfaq.html |
| MeSH 인덱싱 방법 | https://www.nlm.nih.gov/mesh/intro_indexing.html |
| PubMed XML 요소 레퍼런스 | https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html |
| E-utilities API 문서 | https://www.ncbi.nlm.nih.gov/books/NBK25499/ |
| efetch 가이드 | https://dataguide.nlm.nih.gov/edirect/efetch.html |
| PubMed 도움말 | https://pubmed.ncbi.nlm.nih.gov/help/ |
