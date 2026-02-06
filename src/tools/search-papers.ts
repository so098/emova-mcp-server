import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  HYPOTHESIS_QUERIES,
  POPULATION_FILTERS,
  searchPubMed,
  fetchPaperDetails,
} from "../lib/pubmed.js";


export function registerSearchPapers(server: McpServer): void {
  server.tool(
    "search_emova_papers",
    "Emova의 세 가지 가설과 관련된 심리학 논문을 PubMed에서 검색합니다. 감정→행동→회고 기반 자기조절 연구를 찾는 데 사용합니다.",
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
    },
    async ({ hypothesis, query, year_from, year_to, max_results, population }) => {
      try {
        // Build search query
        let searchQuery = `(${HYPOTHESIS_QUERIES[hypothesis]}) AND (${query})`;

        if (population && population !== "general") {
          searchQuery += POPULATION_FILTERS[population] ?? "";
        }

        const pmids = await searchPubMed(searchQuery, {
          yearFrom: year_from,
          yearTo: year_to,
          maxResults: max_results ?? 10,
        });

        if (pmids.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    message: "검색 결과가 없습니다. 다른 키워드나 필터를 시도해보세요.",
                    query: searchQuery,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const papers = await fetchPaperDetails(pmids);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  hypothesis,
                  query: searchQuery,
                  total: papers.length,
                  papers: papers.map((p) => ({
                    pmid: p.pmid,
                    title: p.title,
                    authors: p.authors.slice(0, 3).join(", ") + (p.authors.length > 3 ? " et al." : ""),
                    journal: p.journal,
                    year: p.year,
                    doi: p.doi,
                    hypothesisTags: p.hypothesisTags,
                    summary: p.summary,
                  })),
                  note: "이 정보는 연구·교육·제품 설계 참고용이며, 진단이나 치료를 위한 것이 아닙니다.",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `PubMed 검색 중 오류가 발생했습니다: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
