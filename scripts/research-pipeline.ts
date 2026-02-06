import { query } from "@anthropic-ai/claude-code";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const HYPOTHESES = [
  "emotion_as_information",
  "small_actions_self_efficacy",
  "reflection_pattern_recognition",
] as const;

const PROJECT_ROOT = new URL("..", import.meta.url).pathname;

interface ContentBlock {
  type: string;
  text?: string;
}

async function collectResult(
  prompt: string,
): Promise<{ result: string; cost: number }> {
  let lastAssistantText = "";
  let cost = 0;

  for await (const message of query({
    prompt,
    options: {
      maxTurns: 15,
      cwd: PROJECT_ROOT,
      allowedTools: [
        "mcp__emova-research__search_emova_papers",
        "mcp__emova-research__classify_paper_for_emova",
      ],
    },
  })) {
    const msg = message as Record<string, unknown>;

    if (msg.type === "assistant") {
      // assistant 메시지에서 텍스트 블록 추출
      const content = msg.message as { content?: ContentBlock[] } | undefined;
      if (content?.content) {
        const texts = content.content
          .filter((b) => b.type === "text" && b.text)
          .map((b) => b.text!);
        if (texts.length > 0) {
          lastAssistantText = texts.join("\n");
        }
      }
    }

    if (msg.type === "result") {
      const resultText = (msg.result as string) ?? "";
      cost = (msg.total_cost_usd as number) ?? 0;
      if (resultText) {
        return { result: resultText, cost };
      }
    }
  }

  // result가 비어있으면 마지막 assistant 텍스트 사용
  return { result: lastAssistantText, cost };
}

async function searchPhase(): Promise<string[]> {
  console.error("[1/3] 3개 가설 논문 동시 검색 시작...");

  const results = await Promise.all(
    HYPOTHESES.map((hypothesis) =>
      collectResult(
        `search_emova_papers 도구를 사용해서 hypothesis="${hypothesis}"로 최근 5년간 논문을 검색해줘. ` +
          `max_results=5, year_from=2021로 설정해. ` +
          `결과를 논문 제목, 저자, 연도, DOI, 가설 태그, 한 줄 요약 형식으로 마크다운 리스트로 정리해줘. 한국어로 응답해.`,
      ),
    ),
  );

  const totalCost = results.reduce((s, r) => s + r.cost, 0);
  console.error(`[1/3] 검색 완료. 비용: $${totalCost.toFixed(4)}`);
  return results.map((r) => r.result);
}

async function classifyPhase(searchResults: string[]): Promise<string> {
  console.error("[2/3] 논문 분류 시작...");

  const combined = searchResults
    .map((r, i) => `### ${HYPOTHESES[i]}\n${r}`)
    .join("\n\n");

  const { result, cost } = await collectResult(
    `아래 검색 결과에서 DOI가 있는 논문들에 대해 classify_paper_for_emova 도구를 사용해서 분류해줘.\n` +
      `각 논문이 어떤 가설을 지지하는지 정리하고, 가설별로 근거 강도(강/중/약)를 평가해줘.\n` +
      `마크다운 표 형식으로 정리해줘. 한국어로 응답해.\n\n${combined}`,
  );

  console.error(`[2/3] 분류 완료. 비용: $${cost.toFixed(4)}`);
  return result;
}

async function summarizePhase(classifyResult: string): Promise<string> {
  console.error("[3/3] 최종 요약 생성...");

  const { result, cost } = await collectResult(
    `아래 논문 분류 결과를 바탕으로 Emova 리서치 위클리 리포트를 마크다운으로 작성해줘.\n\n` +
      `포함할 내용:\n` +
      `1. 이번 주 검색 요약 (총 논문 수, 가설별 분포)\n` +
      `2. 가설별 핵심 발견 (논문 제목, 핵심 인사이트 1-2줄)\n` +
      `3. Emova 제품 설계에 참고할 점\n` +
      `4. disclaimer: "이 리포트는 연구·교육·제품 설계 참고용이며, 의료적 진단이나 치료를 제공하지 않습니다."\n\n` +
      `도구를 호출하지 말고, 아래 내용만으로 마크다운 리포트를 작성해줘. 한국어로 응답해.\n\n${classifyResult}`,
  );

  console.error(`[3/3] 요약 완료. 비용: $${cost.toFixed(4)}`);
  return result;
}

async function main() {
  console.error("=== Emova 리서치 파이프라인 시작 ===\n");
  const startTime = Date.now();

  const searchResults = await searchPhase();
  const classifyResult = await classifyPhase(searchResults);
  const report = await summarizePhase(classifyResult);

  const today = new Date().toISOString().slice(0, 10);
  const reportsDir = join(PROJECT_ROOT, "reports");
  mkdirSync(reportsDir, { recursive: true });

  const reportPath = join(reportsDir, `${today}.md`);
  writeFileSync(reportPath, report, "utf-8");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`\n=== 완료: ${reportPath} (${elapsed}s) ===`);
}

main().catch((error) => {
  console.error("파이프라인 실행 실패:", error);
  process.exit(1);
});
