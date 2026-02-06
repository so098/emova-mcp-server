import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const SAFETY_GUIDELINES = `
## 안전 가이드라인

- 이 MCP가 제공하는 정보는 "연구·교육·제품 설계 참고용"이며, 의료·정신건강 진단이나 치료, 개인 맞춤 치료 계획을 제공하지 않습니다.
- 사용자의 감정을 "고쳐야 할 것"이 아니라, 현재 나에게 필요한 행동을 알려주는 신호로 다루세요. 감정을 무시·부정하지 마세요.
- 애매한 할 일은 비판하지 말고, 동기강화 상담(Motivational Interviewing) 원칙을 참고해 사용자의 표현을 존중하면서 더 구체적인 작은 행동으로 정리하세요.
- 연구 근거가 약하거나 상반될 때는, 그 한계를 분명하게 말하고 "정답"처럼 단정하지 마세요.
- 자해·자살 생각, 극단적 절망감 등 고위험 표현이 등장하면, 진단/조언을 시도하지 않고 전문적인 도움을 안내하세요:
  - 자살예방상담전화: 1393
  - 정신건강위기상담전화: 1577-0199
`.trim();

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "search-for-hypothesis",
    "Emova의 특정 가설과 연결되는 심리학 연구를 검색하고, 제품 설계에 활용할 인사이트를 정리합니다.",
    {
      hypothesis: z
        .enum([
          "emotion_as_information",
          "small_actions_self_efficacy",
          "reflection_pattern_recognition",
        ])
        .describe("검색할 Emova 가설"),
      query: z.string().describe("추가 검색 키워드 (예: affect decision making)"),
      population: z
        .string()
        .optional()
        .describe("대상 집단 (예: adhd, depression)"),
    },
    async ({ hypothesis, query, population }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `
Emova는 "감정→작은 행동→회고" 기반 자기조절 실험 서비스입니다.

다음 작업을 수행해주세요:

1. \`search_emova_papers\` 도구를 사용하여 "${hypothesis}" 가설과 관련된 연구를 검색하세요.
   - 키워드: "${query}"
   ${population ? `- 대상 집단: "${population}"` : ""}

2. 검색 결과를 바탕으로 다음을 정리해주세요:
   - 각 논문이 Emova의 해당 가설을 어떻게 지지하거나 보완하는지
   - 제품 설계(감정 기록, 행동 제안, 회고 기능)에 활용할 수 있는 구체적 인사이트
   - 연구 근거의 한계나 주의점

3. 먼저 \`emova://hypotheses/${hypothesis}\` 리소스를 참고하여 가설의 맥락을 이해한 후 분석하세요.

${SAFETY_GUIDELINES}
`.trim(),
          },
        },
      ],
    })
  );

  server.prompt(
    "refine-task-with-emotion",
    "사용자의 감정 상태와 애매한 할 일을 입력받아, 감정을 존중하는 작은 행동 계획을 생성합니다.",
    {
      raw_task: z.string().describe("사용자가 적은 애매한 할 일"),
      current_emotion: z.string().describe("사용자가 보고한 감정 상태"),
      growth_focus: z
        .string()
        .optional()
        .describe("성장 방향 (예: self_efficacy, reduce_avoidance, self_compassion)"),
    },
    async ({ raw_task, current_emotion, growth_focus }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `
Emova는 "감정→작은 행동→회고" 기반 자기조절 실험 서비스입니다.

사용자가 다음과 같이 입력했습니다:
- 할 일: "${raw_task}"
- 현재 감정: "${current_emotion}"
${growth_focus ? `- 성장 방향: "${growth_focus}"` : ""}

다음 작업을 수행해주세요:

1. \`refine_ambiguous_task\` 도구를 사용하여 감정 기반 작은 행동 계획을 생성하세요.

2. 도구의 결과를 바탕으로, 사용자에게 자연스럽고 따뜻한 언어로 응답을 작성하세요:
   - 감정을 인정하고 공감하기 (동기강화 상담 스타일)
   - 구체적인 if-then 계획 제안 (1~2개)
   - 왜 이 행동이 도움이 되는지 짧게 설명
   - 부드럽고 격려하는 톤 유지

3. 응답에서 다음을 주의하세요:
   - "해야 한다" 대신 "해볼 수 있다"
   - 작은 행동을 강조하되, 아무것도 하지 않는 것도 괜찮다는 여지 남기기
   - 감정을 평가하거나 "그런 감정은 나쁘다"라고 하지 않기

${SAFETY_GUIDELINES}
`.trim(),
          },
        },
      ],
    })
  );
}
