
## 1) 서버가 노출할 리소스는 무엇입니까?

> 이 MCP 서버는 Emova의 핵심 가설(감정→작은 행동→회고 기반 자기조절)과 관련된 심리학 연구 및 요약 정보를 리소스로 노출합니다.[](https://positivepsychology.com/emotion-regulation/)
>
> - 감정을 행동 선택의 정보로 보는 이론 및 실증 연구
>
>     - 예: affect-as-information 관점, 감정이 의사결정·행동 선택에 미치는 영향.[](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01397/pdf)
>
> - 작은 실행(작은 목표, micro-actions)과 자기효능감·행동 변화의 관계에 대한 연구
>
>     - 예: self-efficacy, mastery experience, implementation intentions(If-Then 계획).[](https://sweetinstitute.com/self-efficacy-and-behavior-change-and-motivation/)
>
> - 감정 기록·회고·패턴 인식과 자기조절/감정조절 전략에 관한 연구
>
>     - 예: emotional self-regulation, self-regulation interventions, 회고 기반 개입.[](https://psychiatry.ucsf.edu/sites/psych.ucsf.edu/files/EMOTION%20REGULATION%20SKILLS%20MANUAL.pdf)
>
> - 각 논문에 대한 메타데이터
>
>     - 제목, 저자, 저널, 연도, DOI, 초록, (가능한 경우) 본문·PDF 링크.[](https://pmc.ncbi.nlm.nih.gov/articles/PMC5112140/)
>
> - Emova 가설 기준 태그
>
>     - `emotion_as_information`, `small_actions_self_efficacy`, `reflection_pattern_recognition`,
>
>     - 추가로 `motivational_interviewing_style`, `implementation_intentions_small_steps`, `personalized_behavior_change` 등.[](https://cancercontrol.cancer.gov/brp/research/constructs/implementation-intentions)
>
- ADHD, 불안장애, 우울증과 관련된 감정조절·자기조절·디지털 개입 연구

- 예: ADHD에서의 감정 조절 난이도와 우울·불안의 연결, 감정 일지·작은 행동 기반 디지털 프로그램이 ADHD+우울/불안에 미치는 효과 등
>
> 이 리소스들은 “연구·교육·제품 설계 참고용”으로만 사용되며, 치료·진단·상담을 위한 것이 아닙니다.[](https://www.ginasearle.com/medical-and-mental-health-disclaimer/)

---

## 2) 어떤 도구를 제공할까요?

> 이 MCP 서버는 Emova의 감정→행동→회고 흐름을 뒷받침하는 심리학 연구를 찾고, Emova 맥락에 맞게 해석하는 다음 도구들을 제공합니다.[](https://codesignal.com/learn/courses/developing-and-integrating-a-mcp-server-in-python/lessons/exploring-and-exposing-mcp-server-capabilities-tools-resources-and-prompts)
>
> - `search_emova_papers`
>
>     - 설명: Emova의 세 가지 가설 및 관련 심리 개념과 연결되는 논문을 검색합니다.
>
>     - 입력:
>
>         - `hypothesis`: `"emotion_as_information" | "small_actions_self_efficacy" | "reflection_pattern_recognition"`
>
>         - `query`: 자유 텍스트 키워드
>
>         - `year_from`, `year_to`, `max_results` (옵션)
>
>     - 출력: 논문 메타데이터 + Emova 가설 태그 + 한 줄 요약.[](https://pmc.ncbi.nlm.nih.gov/articles/PMC11033427/)
>
> - `classify_paper_for_emova`
>
>     - 설명: 특정 논문(또는 DOI/초록)이 Emova의 어떤 가설을 지지/보완하는지 분류합니다.
>
>     - 입력: `doi` 또는 `abstract_text`
>
>     - 출력: 관련 가설 태그, 근거가 되는 문장·요약.
>
> - `refine_ambiguous_task`
>
>     - 설명: 사용자가 애매하게 적은 할 일을, 현재 감정 상태와 성장 방향을 고려한 “작은 실행 계획”으로 다듬습니다.
>
>     - 입력:
>
>         - `raw_task`: 사용자가 적은 애매한 할 일 텍스트
>
>         - `current_emotion`: 사용자가 보고한 감정 상태
>
>         - `growth_focus` (옵션): 예) `"self_efficacy"`, `"reduce_avoidance"`, `"self_compassion"`
>
>     - 출력:
>
>         - `clarified_goal`: 사용자의 말을 존중하면서 정리한 목표 문장 (동기강화 상담 스타일 재진술).[](https://www.ncbi.nlm.nih.gov/books/NBK571068/)
>
>         - `if_then_plan`: implementation intention 형태의 아주 작은 행동 계획.[](https://thriva.co/hub/behaviour-change/implementation-intentions)
>
>         - `rationale_for_user`: 왜 이 행동이 감정·성장에 도움이 될 수 있는지에 대한 짧은 심리적 설명.
>
>         - `sensitivity_notes`: 자책·불안을 자극하지 않기 위한 언어 톤·주의점.
>
>     - 주의: 이 도구는 행동 아이디어·패턴 인식 지원용이며, 치료·진단을 제공하지 않습니다.[](https://www.mentalwellnessapps.com/medical-disclaimer)
>
> - (선택) `generate_emova_insights`
>
>     - 설명: 선택한 논문 여러 편을 기반으로, Emova 기능/인터벤션 설계에 참고할 수 있는 인사이트를 요약합니다.
>
>     - 출력에 `limitations` 필드를 포함해, 근거의 한계와 주의점도 함께 제공합니다.[](https://pmc.ncbi.nlm.nih.gov/articles/PMC11583291/)


> - `population` 필드 추가

    - `"general" | "adhd" | "anxiety_disorder" | "depression" | "adhd_with_anxiety_or_depression"` 같은 값.[](https://formative.jmir.org/2023/1/e48362)
    - “특정 진단 집단(예: ADHD, 불안장애, 우울증)에 대한 연구를 _참고용으로_ 찾을 수 있지만, 개별 사용자의 진단·치료 결정을 내리는 데 사용해서는 안 됩니다.

---

## 3) 제시해야 할 프롬프트

> 이 MCP 서버는 Emova(감정→작은 행동→회고 기반 자기조절 실험 서비스)를 설계·개선하기 위해, 관련 심리학 연구를 찾고 Emova 맥락에 맞게 해석하는 데 사용됩니다.[](https://positivepsychology.com/emotion-regulation/)
>
> Claude는 다음 원칙을 따릅니다.
>
> - 이 MCP가 제공하는 정보는 “연구·교육·제품 설계 참고용”이며, 의료·정신건강 진단이나 치료, 개인 맞춤 치료 계획을 제공해서는 안 됩니다.[](https://www.termsfeed.com/blog/disclaimers-therapists/)
>
> - 사용자의 감정을 “고쳐야 할 것”이 아니라, 현재 나에게 필요한 행동을 알려주는 신호로 다루고, 감정을 무시·부정하지 않습니다.[](https://arxiv.org/html/2502.16038v1)
>
> - 애매한 할 일은 비판하지 말고, 동기강화 상담(Motivational Interviewing) 원칙을 참고해 사용자의 표현을 존중하면서 더 구체적인 작은 행동으로 정리합니다.[](https://positivepsychology.com/motivational-interviewing-principles/)
>
> - 행동 제안은 큰 목표가 아니라, 감정 에너지와 상황에 맞는 아주 작은 실행과 자기효능감 회복에 초점을 둡니다.[](https://sweetinstitute.com/self-efficacy-and-behavior-change-and-motivation/)
>
> - 연구 근거가 약하거나 상반될 때는, 그 한계를 분명하게 말하고 “정답”처럼 단정하지 않습니다.[](https://quenza.com/blog/knowledge-base/behavior-change-mindset/)
>
> - 자해·자살 생각, 극단적 절망감 등 고위험 표현이 등장하면, 진단/조언을 시도하지 않고 전문적인 도움과 긴급 지원을 권하는 안전 가이드라인을 따릅니다.[](https://undark.org/2025/09/18/opinion-chatbots-guardrails-mental-health/)
>
>
> 예시 요청:
>
> - “Emova의 ‘감정은 행동을 촉발하는 정보다’ 가설과 연결되는 연구를 찾아서, 감정→행동 설계에 어떤 인사이트를 줄 수 있는지 정리해줘.”
>
> - “사용자가 ‘요즘 너무 무기력해서 뭐라도 해야 할 것 같은데…’라고 적고 ‘지침+불안’을 보고했을 때, `refine_ambiguous_task`를 사용해 감정을 존중하는 아주 작은 행동 계획을 만들어줘.”
>

---

## 4) 상호 작용해야 하는 외부 시스템은 무엇입니까?

> 이 MCP 서버는 다음 외부 시스템과 상호 작용합니다.[](https://arxiv.org/html/2601.10198v2)
>
> - PubMed / PubMed Central (NCBI E-utilities API)
>
>     - 자기조절, 감정조절, 행동 변화, CBT, 자기효능감 등과 관련된 임상·실증 연구 검색 및 메타데이터 조회.[](https://psychiatry.ucsf.edu/sites/psych.ucsf.edu/files/EMOTION%20REGULATION%20SKILLS%20MANUAL.pdf)
>
> - Crossref API
>
>     - DOI 기반 논문 메타데이터 및 참고문헌 정보 보완.[](https://pmc.ncbi.nlm.nih.gov/articles/PMC5112140/)
>
> - (선택) Semantic Scholar 또는 OpenAlex
>
>     - Emova 관련 키워드(self-efficacy, micro-goals, implementation intentions, affect-as-information 등)를 중심으로, 폭넓은 논문·인용·연관 연구 탐색.[](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01397/pdf)
>
> - (선택) 오픈 액세스 저장소(PubMed Central 등)
- 가능한 경우 논문 본문 또는 PDF 링크 조회.[](https://pmc.ncbi.nlm.nih.gov/articles/PMC11033427/)
>
>
> 이 외부 시스템들은 Emova 설계에 참고할 근거를 제공하기 위한 것이며, 개별 사용자에 대한 진단·치료 결정을 자동으로 내리기 위해 사용되지 않습니다.[](https://pmc.ncbi.nlm.nih.gov/articles/PMC11583291/)