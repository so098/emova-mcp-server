import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

interface HypothesisResource {
  name: string;
  description: string;
  theory: string;
  keyReferences: string[];
  emovaConnection: string;
}

const HYPOTHESES: Record<string, HypothesisResource> = {
  emotion_as_information: {
    name: "감정은 행동을 촉발하는 정보다 (Emotion as Information)",
    description:
      "감정은 단순한 느낌이 아니라, 현재 상황과 필요한 행동에 대한 유용한 정보를 제공합니다. 이 가설은 사용자가 자신의 감정을 '고쳐야 할 문제'가 아닌 '행동 선택의 단서'로 해석하도록 돕는 Emova의 핵심 원리입니다.",
    theory:
      "Gerald Clore와 Norbert Schwarz의 Affect-as-Information 이론에 기반합니다. 감정은 인지적 평가(appraisal)를 통해 의사결정에 영향을 미치며, 감정의 action tendency(행동 경향성)는 적응적 행동을 촉발합니다. 예: 불안은 위험 회피, 분노는 장애물 제거, 슬픔은 도움 요청으로 이어질 수 있습니다.",
    keyReferences: [
      "Schwarz, N. (2012). Feelings-as-information theory. In P. Van Lange, A. Kruglanski, & E. T. Higgins (Eds.), Handbook of theories of social psychology.",
      "Clore, G. L., & Huntsinger, J. R. (2007). How emotions inform judgment and regulate thought. Trends in Cognitive Sciences.",
      "Frijda, N. H. (1986). The Emotions. Cambridge University Press. (Action tendency 개념)",
      "Lerner, J. S., et al. (2015). Emotion and decision making. Annual Review of Psychology.",
    ],
    emovaConnection:
      "Emova에서 사용자가 감정을 기록하면, 그 감정이 '어떤 행동이 필요한지'를 알려주는 신호로 해석됩니다. 예: '무기력함'은 '에너지 회복이 필요하다'는 정보이며, 이를 바탕으로 작은 신체 활동을 제안합니다.",
  },

  small_actions_self_efficacy: {
    name: "작은 실행이 자기효능감을 회복한다 (Small Actions → Self-Efficacy)",
    description:
      "큰 목표 대신 아주 작은 행동(micro-actions)을 실행함으로써, '나는 할 수 있다'는 자기효능감(self-efficacy)을 점진적으로 회복합니다. 이 가설은 Emova의 '작은 행동 계획' 기능의 이론적 토대입니다.",
    theory:
      "Albert Bandura의 자기효능감 이론에 기반합니다. 자기효능감은 mastery experience(성공 경험)에 의해 가장 강력하게 강화되며, 작은 성공의 반복이 큰 변화보다 효과적입니다. Peter Gollwitzer의 Implementation Intentions(실행 의도) 이론은 'if-then 계획'이 행동 개시를 자동화하는 메커니즘을 설명합니다.",
    keyReferences: [
      "Bandura, A. (1997). Self-Efficacy: The Exercise of Control. W.H. Freeman.",
      "Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist.",
      "Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis. Advances in Experimental Social Psychology.",
      "Fogg, B. J. (2019). Tiny Habits: The Small Changes That Change Everything. (작은 행동의 실용적 적용)",
    ],
    emovaConnection:
      "Emova는 사용자의 애매한 할 일을 감정 상태에 맞는 '아주 작은 행동'으로 변환합니다. if-then 형식의 실행 계획은 행동 개시의 심리적 장벽을 낮추고, 완수 가능한 작은 성공 경험을 통해 자기효능감을 쌓습니다.",
  },

  reflection_pattern_recognition: {
    name: "회고를 통한 감정-행동 패턴 인식 (Reflection → Pattern Recognition)",
    description:
      "정기적인 회고(reflection)를 통해 자신의 감정-행동 패턴을 인식하고, 이를 바탕으로 더 적응적인 자기조절 전략을 발전시킵니다. 이 가설은 Emova의 '회고' 기능의 이론적 토대입니다.",
    theory:
      "감정 자기 모니터링(emotional self-monitoring)은 감정 조절의 첫 단계입니다. James Pennebaker의 표현적 글쓰기(expressive writing) 연구는 감정 경험을 구조화하여 기록하는 것이 정서적 처리와 인지적 재구성을 촉진함을 보여줍니다. 또한 메타인지(metacognition)를 통한 패턴 인식은 자기조절 역량의 핵심 요소입니다.",
    keyReferences: [
      "Pennebaker, J. W. (1997). Writing about emotional experiences as a therapeutic process. Psychological Science.",
      "Gross, J. J. (2015). Emotion regulation: Current status and future prospects. Psychological Inquiry.",
      "Flavell, J. H. (1979). Metacognition and cognitive monitoring. American Psychologist.",
      "Koole, S. L. (2009). The psychology of emotion regulation: An integrative review. Cognition and Emotion.",
    ],
    emovaConnection:
      "Emova에서 사용자는 감정 기록과 행동 실행 후 정기적으로 회고합니다. 이 과정에서 '무기력할 때 산책을 하면 기분이 나아진다' 같은 자신만의 감정-행동 패턴을 발견하고, 이를 자기조절에 활용할 수 있게 됩니다.",
  },
};

export function registerHypothesisResources(server: McpServer): void {
  for (const [key, hypothesis] of Object.entries(HYPOTHESES)) {
    server.resource(
      key,
      `emova://hypotheses/${key}`,
      {
        description: hypothesis.name,
        mimeType: "application/json",
      },
      async () => ({
        contents: [
          {
            uri: `emova://hypotheses/${key}`,
            mimeType: "application/json",
            text: JSON.stringify(hypothesis, null, 2),
          },
        ],
      })
    );
  }
}
