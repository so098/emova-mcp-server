import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface EmotionActionMapping {
  emotionPatterns: string[];
  suggestedActions: string[];
  ifThenTemplate: string;
  rationale: string;
}

const EMOTION_ACTION_MAPPINGS: EmotionActionMapping[] = [
  {
    emotionPatterns: ["무기력", "지침", "피곤", "귀찮", "힘없", "에너지"],
    suggestedActions: [
      "5분 동안 창문을 열고 바깥 공기를 느껴보기",
      "좋아하는 음악 한 곡만 들으며 스트레칭하기",
      "따뜻한 물 한 잔 마시며 1분 동안 아무것도 안 하기",
      "현관문 밖에 나갔다 들어오기 (30초도 충분)",
    ],
    ifThenTemplate:
      "만약 자리에서 일어나기 어렵다면, 먼저 [아주 작은 감각 자극]을 한다",
    rationale:
      "무기력할 때 큰 목표는 오히려 부담이 됩니다. 아주 작은 신체 감각 변화가 뇌의 각성 수준을 살짝 올려, 다음 행동으로 이어질 수 있는 작은 모멘텀을 만듭니다 (behavioral activation 원리).",
  },
  {
    emotionPatterns: ["불안", "걱정", "두려", "긴장", "초조", "떨림"],
    suggestedActions: [
      "지금 걱정되는 것 하나만 메모장에 적기",
      "오늘 할 일 중 가장 작은 것 하나만 시작 시간 정하기",
      "3분 동안 호흡에 집중하며 숨 세기 (4-7-8 호흡)",
      "걱정되는 상황의 '최선의 시나리오'를 한 줄로 적기",
    ],
    ifThenTemplate:
      "만약 [걱정되는 상황]이 떠오르면, 먼저 [구체적인 아주 작은 준비 행동]을 한다",
    rationale:
      "불안은 '불확실성'에 대한 자연스러운 반응입니다. 구체적인 if-then 계획은 불확실성을 줄이고, 실행 의도(implementation intention)가 자동적 행동 개시를 돕습니다.",
  },
  {
    emotionPatterns: ["자책", "죄책", "후회", "미안", "부끄", "수치"],
    suggestedActions: [
      "자신에게 짧은 격려 메시지 적기 (친한 친구에게 하듯이)",
      "지금 할 수 있는 아주 작은 자기돌봄 하나 하기 (손 씻기, 얼굴 씻기)",
      "'이미 잘한 것' 한 가지를 메모장에 적기",
      "완벽하지 않아도 괜찮다고 3번 천천히 말하기",
    ],
    ifThenTemplate:
      "만약 자책하는 생각이 들면, 먼저 [자기연민 기반 작은 행동]을 한다",
    rationale:
      "자책은 행동을 위축시킵니다. 자기연민(self-compassion)은 실패를 인간 보편적 경험으로 재해석하게 하여, 자기효능감을 회복하는 데 도움이 됩니다 (Kristin Neff의 self-compassion 연구).",
  },
  {
    emotionPatterns: ["슬픔", "우울", "외로", "허전", "공허", "서운"],
    suggestedActions: [
      "좋아하는 사진이나 영상 하나만 보기",
      "감사한 것 하나를 떠올리며 적기",
      "신뢰하는 사람에게 짧은 메시지 보내기 (안부 인사도 충분)",
      "따뜻한 음료를 만들며 그 과정에 집중하기",
    ],
    ifThenTemplate:
      "만약 마음이 가라앉는 느낌이 들면, 먼저 [작은 연결감이나 위안을 주는 행동]을 한다",
    rationale:
      "슬픔은 상실이나 단절에 대한 자연스러운 반응입니다. 작은 사회적 연결이나 감각적 위안이 정서 조절을 돕고, 고립감을 줄이는 데 효과적입니다.",
  },
];

const GROWTH_FOCUS_GUIDANCE: Record<string, string> = {
  self_efficacy:
    "자기효능감 회복에 초점: '내가 할 수 있다'는 작은 성공 경험을 쌓는 것이 핵심입니다. 가능한 한 확실히 완수할 수 있는 아주 작은 행동부터 시작하세요.",
  reduce_avoidance:
    "회피 줄이기에 초점: 회피하고 싶은 것에 '아주 조금만' 다가가는 것이 중요합니다. 전부 하지 않아도 됩니다. 시작하는 것 자체가 성공입니다.",
  self_compassion:
    "자기연민에 초점: 자신을 대하는 방식을 친한 친구를 대하듯 부드럽게 바꾸는 것이 목표입니다. 완벽하지 않아도 괜찮습니다.",
};

export function findBestMapping(emotion: string): EmotionActionMapping {
  const lowerEmotion = emotion.toLowerCase();

  for (const mapping of EMOTION_ACTION_MAPPINGS) {
    if (mapping.emotionPatterns.some((p) => lowerEmotion.includes(p))) {
      return mapping;
    }
  }

  // Default: return first mapping (무기력)
  return EMOTION_ACTION_MAPPINGS[0];
}

export function registerRefineTask(server: McpServer): void {
  server.tool(
    "refine_ambiguous_task",
    "사용자가 애매하게 적은 할 일을, 현재 감정 상태와 성장 방향을 고려해 '감정 기반 작은 행동 계획'으로 다듬습니다. 이 도구는 행동 아이디어·패턴 인식 지원용이며, 치료·진단을 제공하지 않습니다.",
    {
      raw_task: z.string().describe("사용자가 적은 애매한 할 일"),
      current_emotion: z.string().describe("사용자가 보고한 감정 상태"),
      growth_focus: z
        .string()
        .optional()
        .describe("예: self_efficacy, reduce_avoidance, self_compassion"),
    },
    async ({ raw_task, current_emotion, growth_focus }) => {
      const mapping = findBestMapping(current_emotion);

      const growthGuidance = growth_focus
        ? GROWTH_FOCUS_GUIDANCE[growth_focus] ??
          `성장 방향 '${growth_focus}'에 맞춰 행동을 조정해주세요.`
        : undefined;

      const result = {
        raw_task,
        current_emotion,
        growth_focus: growth_focus ?? null,

        clarified_goal: `"${raw_task}"라는 마음이 드셨군요. ${current_emotion} 상태에서 이런 생각이 드는 것은 자연스러운 일입니다. 지금 할 수 있는 아주 작은 한 걸음부터 시작해볼까요?`,

        if_then_plan: {
          template: mapping.ifThenTemplate,
          suggested_actions: mapping.suggestedActions,
          instruction:
            "위 행동 중 하나를 골라, if-then 템플릿에 넣어 구체적인 계획을 만들어주세요.",
        },

        rationale_for_user: mapping.rationale,

        sensitivity_notes: [
          "사용자의 감정을 '고쳐야 할 것'이 아니라 '지금 나에게 필요한 것을 알려주는 신호'로 다루세요.",
          "행동을 '해야 한다'가 아니라 '해볼 수 있다'로 제안하세요.",
          "'작은 행동'을 강조하되, 아무것도 하지 않는 것도 괜찮다는 여지를 남기세요.",
          "자책이나 죄책감이 포함된 감정일 경우, 자기연민(self-compassion) 언어를 사용하세요.",
          "자해·자살 관련 표현이 있으면, 전문적인 도움을 안내하세요 (예: 자살예방상담전화 1393, 정신건강위기상담전화 1577-0199).",
        ],

        ...(growthGuidance && { growth_guidance: growthGuidance }),

        framework_note:
          "이 결과는 감정-행동 매핑 프레임워크 기반 구조입니다. Claude가 이 결과를 바탕으로 사용자에게 자연스럽고 따뜻한 언어로 최종 응답을 생성해주세요.",

        disclaimer:
          "이 도구는 연구·교육·제품 설계 참고용이며, 전문적인 심리 상담이나 치료를 대체하지 않습니다.",
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
