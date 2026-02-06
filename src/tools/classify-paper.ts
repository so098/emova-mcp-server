import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  classifyByKeywords,
  classifyByMeshTerms,
  classifyCombined,
  searchByDoi,
  fetchPaperDetails,
  HYPOTHESIS_MESH_TERMS,
} from "../lib/pubmed.js";
import type { Hypothesis } from "../types.js";

const HYPOTHESIS_KEYWORD_DETAILS: Record<Hypothesis, string[]> = {
  emotion_as_information: [
    "affect",
    "emotion regulation",
    "emotional information",
    "appraisal",
    "action tendency",
    "affect as information",
    "emotion decision",
    "emotional processing",
    "mood",
    "feeling",
    "valence",
  ],
  small_actions_self_efficacy: [
    "self-efficacy",
    "mastery",
    "small steps",
    "micro",
    "implementation intention",
    "goal setting",
    "behavior change",
    "self-regulation",
    "incremental",
    "graded task",
  ],
  reflection_pattern_recognition: [
    "self-monitoring",
    "reflection",
    "diary",
    "journaling",
    "pattern",
    "self-awareness",
    "metacognition",
    "reflective practice",
    "self-observation",
    "tracking",
  ],
};

export function extractMatchingSentences(
  text: string,
  keywords: string[]
): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const matched: string[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      matched.push(sentence.trim());
    }
  }

  return matched;
}

export function registerClassifyPaper(server: McpServer): void {
  server.tool(
    "classify_paper_for_emova",
    "특정 논문(DOI 또는 초록)이 Emova의 어떤 가설(감정→정보, 작은 행동→자기효능감, 회고→패턴인식)을 지지하는지 분류합니다.",
    {
      doi: z.string().optional().describe("논문 DOI"),
      abstract_text: z
        .string()
        .optional()
        .describe("논문 초록 텍스트 (DOI가 없을 경우)"),
    },
    async ({ doi, abstract_text }) => {
      try {
        if (!doi && !abstract_text) {
          return {
            content: [
              {
                type: "text" as const,
                text: "doi 또는 abstract_text 중 하나를 반드시 입력해야 합니다.",
              },
            ],
            isError: true,
          };
        }

        let abstractText = abstract_text ?? "";
        let title = "";
        let paperPmid = "";
        let meshTerms: string[] = [];

        // If DOI is provided, fetch paper from PubMed
        if (doi) {
          const pmids = await searchByDoi(doi);
          if (pmids.length > 0) {
            const papers = await fetchPaperDetails(pmids);
            if (papers.length > 0) {
              abstractText = papers[0].abstract || abstractText;
              title = papers[0].title;
              paperPmid = papers[0].pmid;
              meshTerms = papers[0].meshTerms;
            }
          }
        }

        if (!abstractText) {
          return {
            content: [
              {
                type: "text" as const,
                text: "초록 텍스트를 가져올 수 없습니다. DOI를 확인하거나 abstract_text를 직접 입력해주세요.",
              },
            ],
            isError: true,
          };
        }

        const fullText = `${title} ${abstractText}`;
        const hypothesisTags = classifyCombined(fullText, meshTerms);

        // Build detailed classification
        const classification: Record<
          string,
          {
            matched: boolean;
            matchedKeywords: string[];
            matchedMeshTerms: string[];
            supportingSentences: string[];
          }
        > = {};

        for (const [hypothesis, keywords] of Object.entries(
          HYPOTHESIS_KEYWORD_DETAILS
        )) {
          const lowerText = fullText.toLowerCase();
          const matchedKeywords = keywords.filter((kw) =>
            lowerText.includes(kw.toLowerCase())
          );
          const supportingSentences = extractMatchingSentences(
            abstractText,
            matchedKeywords
          );

          // MeSH term matching for this hypothesis
          const targetMesh = HYPOTHESIS_MESH_TERMS[hypothesis as Hypothesis] ?? [];
          const normalizedPaperMesh = meshTerms.map((t) => t.toLowerCase());
          const matchedMeshTerms = targetMesh.filter((target) =>
            normalizedPaperMesh.some((t) => t.includes(target.toLowerCase()))
          );

          classification[hypothesis] = {
            matched: matchedKeywords.length > 0 || matchedMeshTerms.length > 0,
            matchedKeywords,
            matchedMeshTerms,
            supportingSentences: supportingSentences.slice(0, 3),
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ...(paperPmid && { pmid: paperPmid }),
                  ...(title && { title }),
                  ...(doi && { doi }),
                  ...(meshTerms.length > 0 && { meshTerms }),
                  hypothesisTags,
                  classification,
                  note: "이 분류는 키워드 + MeSH 용어 기반 자동 분류이며, 전문가 리뷰를 대체하지 않습니다.",
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
              text: `논문 분류 중 오류가 발생했습니다: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
