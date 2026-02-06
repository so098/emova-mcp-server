# refine_ambiguous_task

모호한 할 일을 현재 감정 상태와 성장 방향을 고려해 감정 기반 마이크로 액션 계획으로 변환합니다.

## 데이터 흐름

```
MCP Client                MCP Server
    │                         │
    │  ① tool call (JSON)     │
    │ ───────────────────────→ │
    │                         │  ② 감정 패턴 매칭 + 행동 매핑 (로컬)
    │  ③ tool result (JSON)   │
    │ ←─────────────────────── │
```

외부 API를 호출하지 않습니다. 코드에 내장된 감정-행동 매핑 테이블을 기반으로 로컬에서 처리합니다.

---

## 1. MCP 도구 인터페이스 (클라이언트 ↔ 이 서버)

이 섹션만으로 MCP 클라이언트에서 도구를 호출할 수 있습니다.

### Request (MCP tool call)

```json
{
  "name": "refine_ambiguous_task",
  "arguments": {
    "raw_task": "요즘 운동을 좀 해야 할 것 같은데...",
    "current_emotion": "무기력하고 지침",
    "growth_focus": "self_efficacy"
  }
}
```

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `raw_task` | `string` | Yes | 사용자가 적은 애매한 할 일 |
| `current_emotion` | `string` | Yes | 사용자가 보고한 감정 상태 |
| `growth_focus` | `string` | No | `self_efficacy` \| `reduce_avoidance` \| `self_compassion` |

### Response (MCP tool result)

```json
{
  "raw_task": "요즘 운동을 좀 해야 할 것 같은데...",
  "current_emotion": "무기력하고 지침",
  "growth_focus": "self_efficacy",

  "clarified_goal": "\"요즘 운동을 좀 해야 할 것 같은데...\"라는 마음이 드셨군요. 무기력하고 지침 상태에서 이런 생각이 드는 것은 자연스러운 일입니다. 지금 할 수 있는 아주 작은 한 걸음부터 시작해볼까요?",

  "if_then_plan": {
    "template": "만약 자리에서 일어나기 어렵다면, 먼저 [아주 작은 감각 자극]을 한다",
    "suggested_actions": [
      "5분 동안 창문을 열고 바깥 공기를 느껴보기",
      "좋아하는 음악 한 곡만 들으며 스트레칭하기",
      "따뜻한 물 한 잔 마시며 1분 동안 아무것도 안 하기",
      "현관문 밖에 나갔다 들어오기 (30초도 충분)"
    ],
    "instruction": "위 행동 중 하나를 골라, if-then 템플릿에 넣어 구체적인 계획을 만들어주세요."
  },

  "rationale_for_user": "무기력할 때 큰 목표는 오히려 부담이 됩니다. 아주 작은 신체 감각 변화가 뇌의 각성 수준을 살짝 올려, 다음 행동으로 이어질 수 있는 작은 모멘텀을 만듭니다 (behavioral activation 원리).",

  "sensitivity_notes": [
    "사용자의 감정을 '고쳐야 할 것'이 아니라 '지금 나에게 필요한 것을 알려주는 신호'로 다루세요.",
    "행동을 '해야 한다'가 아니라 '해볼 수 있다'로 제안하세요.",
    "'작은 행동'을 강조하되, 아무것도 하지 않는 것도 괜찮다는 여지를 남기세요.",
    "자책이나 죄책감이 포함된 감정일 경우, 자기연민(self-compassion) 언어를 사용하세요.",
    "자해·자살 관련 표현이 있으면, 전문적인 도움을 안내하세요 (예: 자살예방상담전화 1393, 정신건강위기상담전화 1577-0199)."
  ],

  "growth_guidance": "자기효능감 회복에 초점: '내가 할 수 있다'는 작은 성공 경험을 쌓는 것이 핵심입니다. 가능한 한 확실히 완수할 수 있는 아주 작은 행동부터 시작하세요.",

  "framework_note": "이 결과는 감정-행동 매핑 프레임워크 기반 구조입니다. Claude가 이 결과를 바탕으로 사용자에게 자연스럽고 따뜻한 언어로 최종 응답을 생성해주세요.",

  "disclaimer": "이 도구는 연구·교육·제품 설계 참고용이며, 전문적인 심리 상담이나 치료를 대체하지 않습니다."
}
```

---

## 2. 내부 처리 로직 (이 서버 내부)

**코드 위치:** `src/tools/refine-task.ts`

### 감정 패턴 매칭

`findBestMapping()` 함수는 사용자의 감정 텍스트에서 패턴을 매칭합니다:

| 감정 패턴 | 매칭 키워드 | 이론적 기반 | 핵심 논문 검증 링크 |
|-----------|------------|-------------|-------------------|
| 무기력/피로 | 무기력, 지침, 피곤, 귀찮, 힘없, 에너지 | Behavioral Activation | [PubMed: 16881773](https://pubmed.ncbi.nlm.nih.gov/16881773/) |
| 불안/걱정 | 불안, 걱정, 두려, 긴장, 초조, 떨림 | Implementation Intentions | [PubMed: 10589297](https://pubmed.ncbi.nlm.nih.gov/10589297/) |
| 자책/죄책감 | 자책, 죄책, 후회, 미안, 부끄, 수치 | Self-Compassion | [PubMed: 22945619](https://pubmed.ncbi.nlm.nih.gov/22945619/) |
| 슬픔/우울 | 슬픔, 우울, 외로, 허전, 공허, 서운 | Social Connection + Emotion Regulation | [PubMed: 26171108](https://pubmed.ncbi.nlm.nih.gov/26171108/) |

매칭되는 패턴이 없을 경우 기본값으로 무기력/피로 매핑을 사용합니다.

### 성장 방향 (`growth_focus`) 가이드

| 값 | 설명 | 이론적 기반 |
|----|------|-------------|
| `self_efficacy` | 작은 성공 경험 쌓기 | Bandura (1997) — [Google Scholar](https://scholar.google.com/scholar?q=Bandura+Self-Efficacy+Exercise+of+Control+1997) |
| `reduce_avoidance` | 회피 행동 줄이기 | Behavioral Activation — [PubMed: 17112646](https://pubmed.ncbi.nlm.nih.gov/17112646/) |
| `self_compassion` | 자기연민 기반 접근 | Neff (2003) — [Google Scholar](https://scholar.google.com/scholar?q=Neff+self-compassion+alternative+conceptualization+2003) |

---

## 3. 이론적 근거

이 도구의 핵심 로직은 사용자의 감정 상태를 인식하고, 그에 맞는 아주 작은 행동을 제안하는 것입니다. 이 매핑은 다음 이론들에 기반합니다.

### 3-1. Behavioral Activation (행동 활성화)

무기력/우울 상태에서 작은 행동을 통해 활동 수준을 높이는 근거 기반 접근법입니다.

| 논문 | 검증 링크 |
|------|-----------|
| Martell, C. R., et al. (2001). *Behavioral activation treatment for depression.* | [Google Scholar](https://scholar.google.com/scholar?q=Martell+behavioral+activation+treatment+depression+2001) |
| Dimidjian, S., et al. (2006). Randomized trial of behavioral activation, cognitive therapy, and antidepressant medication. *JCCP.* | [PubMed: 16881773](https://pubmed.ncbi.nlm.nih.gov/16881773/) |
| Cuijpers, P., et al. (2007). Behavioral activation treatments of depression: A meta-analysis. *Clinical Psychology Review.* | [PubMed: 17112646](https://pubmed.ncbi.nlm.nih.gov/17112646/) |

코드에서의 적용 (`EMOTION_ACTION_MAPPINGS` 중 무기력 패턴):
```typescript
{
  emotionPatterns: ["무기력", "지침", "피곤", "귀찮", "힘없", "에너지"],
  rationale: "무기력할 때 큰 목표는 오히려 부담이 됩니다. 아주 작은 신체 감각 변화가 뇌의 각성 수준을
    살짝 올려, 다음 행동으로 이어질 수 있는 작은 모멘텀을 만듭니다 (behavioral activation 원리)."
}
```

### 3-2. Implementation Intentions (실행 의도)

"만약 X이면, Y를 한다" 형식의 if-then 계획이 행동 개시를 자동화하는 메커니즘입니다.

| 논문 | 검증 링크 |
|------|-----------|
| Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. *American Psychologist.* | [PubMed: 10589297](https://pubmed.ncbi.nlm.nih.gov/10589297/) |
| Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis. | [Google Scholar](https://scholar.google.com/scholar?q=Gollwitzer+Sheeran+implementation+intentions+meta-analysis+2006) |
| Adriaanse, M. A., et al. (2011). Breaking habits with implementation intentions. *JEPHPP.* | [PubMed: 21058901](https://pubmed.ncbi.nlm.nih.gov/21058901/) |

코드에서의 적용 (if-then 템플릿):
```typescript
ifThenTemplate: "만약 [걱정되는 상황]이 떠오르면, 먼저 [구체적인 아주 작은 준비 행동]을 한다"
```

### 3-3. Self-Compassion (자기연민)

자책/죄책감 상태에서 자기비판 대신 자기연민을 사용하여 자기효능감을 회복하는 접근법입니다.

| 논문 | 검증 링크 |
|------|-----------|
| Neff, K. D. (2003). Self-compassion: An alternative conceptualization of a healthy attitude toward oneself. *Self and Identity.* | [Google Scholar](https://scholar.google.com/scholar?q=Neff+self-compassion+alternative+conceptualization+2003) |
| Neff, K. D. (2011). *Self-Compassion: The Proven Power of Being Kind to Yourself.* | [Google Scholar](https://scholar.google.com/scholar?q=Neff+Self-Compassion+Proven+Power+Being+Kind+2011) |
| MacBeth, A., & Gumley, A. (2012). Exploring compassion: A meta-analysis of the association between self-compassion and psychopathology. *Clinical Psychology Review.* | [PubMed: 22945619](https://pubmed.ncbi.nlm.nih.gov/22945619/) |

코드에서의 적용:
```typescript
{
  emotionPatterns: ["자책", "죄책", "후회", "미안", "부끄", "수치"],
  rationale: "자책은 행동을 위축시킵니다. 자기연민(self-compassion)은 실패를 인간 보편적 경험으로
    재해석하게 하여, 자기효능감을 회복하는 데 도움이 됩니다 (Kristin Neff의 self-compassion 연구)."
}
```

### 3-4. Self-Efficacy Theory (자기효능감 이론)

작은 성공 경험(mastery experience)이 자기효능감을 가장 강력하게 강화한다는 Bandura의 이론입니다.

| 논문 | 검증 링크 |
|------|-----------|
| Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. *Psychological Review.* | [PubMed: 847061](https://pubmed.ncbi.nlm.nih.gov/847061/) |
| Bandura, A. (1997). *Self-Efficacy: The Exercise of Control.* W.H. Freeman. | [Google Scholar](https://scholar.google.com/scholar?q=Bandura+Self-Efficacy+Exercise+of+Control+1997) |

코드에서의 적용 (`GROWTH_FOCUS_GUIDANCE`):
```typescript
self_efficacy: "자기효능감 회복에 초점: '내가 할 수 있다'는 작은 성공 경험을 쌓는 것이 핵심입니다.
  가능한 한 확실히 완수할 수 있는 아주 작은 행동부터 시작하세요."
```

### 3-5. Motivational Interviewing (동기강화 상담)

사용자의 표현을 비판하지 않고 존중하면서 변화 동기를 이끌어내는 상담 접근법입니다.

| 논문 | 검증 링크 |
|------|-----------|
| Miller, W. R., & Rollnick, S. (2012). *Motivational Interviewing: Helping People Change.* (3rd ed.) Guilford Press. | [Google Scholar](https://scholar.google.com/scholar?q=Miller+Rollnick+Motivational+Interviewing+Helping+People+Change+2012) |
| Lundahl, B. W., et al. (2010). A meta-analysis of motivational interviewing. *British Journal of General Practice.* | [PubMed: 20594429](https://pubmed.ncbi.nlm.nih.gov/20594429/) |

코드에서의 적용 (`clarified_goal` 생성):
```typescript
clarified_goal: `"${raw_task}"라는 마음이 드셨군요. ${current_emotion} 상태에서
  이런 생각이 드는 것은 자연스러운 일입니다. 지금 할 수 있는 아주 작은 한 걸음부터 시작해볼까요?`
```
