import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyByKeywords, classifyByMeshTerms, classifyCombined, parseMeshTerms, searchPubMed, fetchPaperDetails } from "../pubmed.js";

describe("classifyByKeywords", () => {
  it("텍스트에 매칭 키워드가 있으면 emotion_as_information 태그를 반환한다", () => {
    const text = "This study examines affect as information in decision making";
    const tags = classifyByKeywords(text);
    expect(tags).toContain("emotion_as_information");
  });

  it("텍스트에 매칭 키워드가 있으면 small_actions_self_efficacy 태그를 반환한다", () => {
    const text = "The role of self-efficacy and implementation intention in behavior change";
    const tags = classifyByKeywords(text);
    expect(tags).toContain("small_actions_self_efficacy");
  });

  it("텍스트에 매칭 키워드가 있으면 reflection_pattern_recognition 태그를 반환한다", () => {
    const text = "Self-monitoring and reflective practice improve metacognition";
    const tags = classifyByKeywords(text);
    expect(tags).toContain("reflection_pattern_recognition");
  });

  it("여러 가설에 매칭되면 복수의 태그를 반환한다", () => {
    const text =
      "Affect regulation through self-monitoring and self-efficacy building via journaling";
    const tags = classifyByKeywords(text);
    expect(tags.length).toBeGreaterThanOrEqual(2);
  });

  it("관련 없는 텍스트에는 빈 배열을 반환한다", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const tags = classifyByKeywords(text);
    expect(tags).toEqual([]);
  });

  it("빈 텍스트에는 빈 배열을 반환한다", () => {
    const tags = classifyByKeywords("");
    expect(tags).toEqual([]);
  });

  it("대소문자를 구분하지 않는다", () => {
    const tags = classifyByKeywords("SELF-EFFICACY AND MASTERY EXPERIENCE");
    expect(tags).toContain("small_actions_self_efficacy");
  });
});

describe("classifyByMeshTerms", () => {
  it("감정 관련 MeSH 용어가 있으면 emotion_as_information 태그를 반환한다", () => {
    const tags = classifyByMeshTerms(["Emotions", "Cognition"]);
    expect(tags).toContain("emotion_as_information");
  });

  it("자기효능감 관련 MeSH 용어가 있으면 small_actions_self_efficacy 태그를 반환한다", () => {
    const tags = classifyByMeshTerms(["Self Efficacy", "Humans"]);
    expect(tags).toContain("small_actions_self_efficacy");
  });

  it("메타인지 관련 MeSH 용어가 있으면 reflection_pattern_recognition 태그를 반환한다", () => {
    const tags = classifyByMeshTerms(["Metacognition", "Humans"]);
    expect(tags).toContain("reflection_pattern_recognition");
  });

  it("관련 없는 MeSH 용어만 있으면 빈 배열을 반환한다", () => {
    const tags = classifyByMeshTerms(["Humans", "Male", "Female"]);
    expect(tags).toEqual([]);
  });

  it("빈 배열이면 빈 배열을 반환한다", () => {
    const tags = classifyByMeshTerms([]);
    expect(tags).toEqual([]);
  });

  it("대소문자를 구분하지 않는다", () => {
    const tags = classifyByMeshTerms(["SELF EFFICACY"]);
    expect(tags).toContain("small_actions_self_efficacy");
  });
});

describe("classifyCombined", () => {
  it("키워드와 MeSH 결과를 합친다", () => {
    // 키워드로는 emotion만, MeSH로는 self-efficacy만 매칭
    const tags = classifyCombined(
      "This study examines affect as information",
      ["Self Efficacy"]
    );
    expect(tags).toContain("emotion_as_information");
    expect(tags).toContain("small_actions_self_efficacy");
  });

  it("중복 태그를 제거한다", () => {
    const tags = classifyCombined(
      "self-efficacy in mastery experiences",
      ["Self Efficacy"]
    );
    const count = tags.filter((t) => t === "small_actions_self_efficacy").length;
    expect(count).toBe(1);
  });
});

describe("parseMeshTerms", () => {
  it("XML에서 MeSH DescriptorName을 추출한다", () => {
    const xml = `
      <MeshHeadingList>
        <MeshHeading>
          <DescriptorName UI="D012649" MajorTopicYN="N">Self Efficacy</DescriptorName>
        </MeshHeading>
        <MeshHeading>
          <DescriptorName UI="D006801" MajorTopicYN="N">Humans</DescriptorName>
        </MeshHeading>
      </MeshHeadingList>
    `;
    const terms = parseMeshTerms(xml);
    expect(terms).toEqual(["Self Efficacy", "Humans"]);
  });

  it("MeSH 태그가 없으면 빈 배열을 반환한다", () => {
    const xml = "<PubmedArticle><PMID>12345</PMID></PubmedArticle>";
    const terms = parseMeshTerms(xml);
    expect(terms).toEqual([]);
  });
});

describe("searchPubMed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("정상 응답 시 pmid 목록을 반환한다", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        esearchresult: { idlist: ["12345", "67890"] },
      }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await searchPubMed("test query");
    expect(result).toEqual(["12345", "67890"]);
  });

  it("검색 결과가 없으면 빈 배열을 반환한다", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        esearchresult: { idlist: [] },
      }),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await searchPubMed("nonexistent query");
    expect(result).toEqual([]);
  });

  it("esearchresult가 없으면 빈 배열을 반환한다", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({}),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await searchPubMed("test");
    expect(result).toEqual([]);
  });

  it("응답이 실패하면 에러를 던진다", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await expect(searchPubMed("test")).rejects.toThrow("PubMed esearch failed");
  });

  it("year와 maxResults 파라미터를 올바르게 전달한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ esearchresult: { idlist: [] } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await searchPubMed("test", { yearFrom: 2020, yearTo: 2024, maxResults: 5 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("mindate=2020");
    expect(calledUrl).toContain("maxdate=2024");
    expect(calledUrl).toContain("retmax=5");
  });
});

describe("fetchPaperDetails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("빈 pmid 목록이면 빈 배열을 반환한다", async () => {
    const result = await fetchPaperDetails([]);
    expect(result).toEqual([]);
  });

  it("XML 응답을 PaperMetadata로 파싱한다", async () => {
    const xmlResponse = `
      <PubmedArticleSet>
        <PubmedArticle>
          <MedlineCitation>
            <PMID Version="1">12345</PMID>
            <Article>
              <ArticleTitle>Self-efficacy and behavior change</ArticleTitle>
              <Journal>
                <Title>Journal of Psychology</Title>
                <ISOAbbreviation>J Psychol</ISOAbbreviation>
              </Journal>
              <Abstract>
                <AbstractText>This study examines self-efficacy in mastery experiences and goal setting interventions.</AbstractText>
              </Abstract>
              <AuthorList>
                <Author>
                  <LastName>Kim</LastName>
                  <Initials>SY</Initials>
                </Author>
              </AuthorList>
            </Article>
            <MeshHeadingList>
              <MeshHeading>
                <DescriptorName UI="D012649" MajorTopicYN="Y">Self Efficacy</DescriptorName>
              </MeshHeading>
              <MeshHeading>
                <DescriptorName UI="D006801" MajorTopicYN="N">Humans</DescriptorName>
              </MeshHeading>
            </MeshHeadingList>
          </MedlineCitation>
          <PubmedData>
            <ArticleIdList>
              <ArticleId IdType="doi">10.1234/test</ArticleId>
            </ArticleIdList>
            <History>
              <PubMedPubDate PubStatus="pubmed">
                <Year>2023</Year>
              </PubMedPubDate>
            </History>
          </PubmedData>
        </PubmedArticle>
      </PubmedArticleSet>
    `;

    const mockResponse = {
      ok: true,
      text: async () => xmlResponse,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchPaperDetails(["12345"]);
    expect(result).toHaveLength(1);
    expect(result[0].pmid).toBe("12345");
    expect(result[0].title).toBe("Self-efficacy and behavior change");
    expect(result[0].authors).toEqual(["Kim SY"]);
    expect(result[0].journal).toBe("Journal of Psychology");
    expect(result[0].doi).toBe("10.1234/test");
    expect(result[0].meshTerms).toEqual(["Self Efficacy", "Humans"]);
    expect(result[0].hypothesisTags).toContain("small_actions_self_efficacy");
  });

  it("응답이 실패하면 에러를 던진다", async () => {
    const mockResponse = {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await expect(fetchPaperDetails(["12345"])).rejects.toThrow("PubMed efetch failed");
  });
});
