import { describe, it, expect } from "vitest";
import { extractMatchingSentences } from "../classify-paper.js";

describe("extractMatchingSentences", () => {
  it("매칭 키워드가 포함된 문장을 추출한다", () => {
    const text =
      "This study examines affect regulation. The method used surveys. Emotion regulation was measured daily.";
    const keywords = ["affect", "emotion regulation"];
    const result = extractMatchingSentences(text, keywords);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("affect");
    expect(result[1]).toContain("Emotion regulation");
  });

  it("대소문자를 구분하지 않는다", () => {
    const text = "SELF-EFFICACY was measured using a validated scale.";
    const keywords = ["self-efficacy"];
    const result = extractMatchingSentences(text, keywords);
    expect(result).toHaveLength(1);
  });

  it("매칭 키워드가 없으면 빈 배열을 반환한다", () => {
    const text = "The weather was sunny. The park was crowded.";
    const keywords = ["self-efficacy", "emotion"];
    const result = extractMatchingSentences(text, keywords);
    expect(result).toEqual([]);
  });

  it("빈 텍스트에는 빈 배열을 반환한다", () => {
    const keywords = ["affect", "emotion"];
    const result = extractMatchingSentences("", keywords);
    expect(result).toEqual([]);
  });

  it("빈 키워드 목록이면 빈 배열을 반환한다", () => {
    const text = "Some text about self-efficacy.";
    const result = extractMatchingSentences(text, []);
    expect(result).toEqual([]);
  });

  it("같은 키워드가 여러 문장에 있으면 모두 추출한다", () => {
    const text =
      "Reflection improves self-awareness. Daily reflection is beneficial. Exercise is also good.";
    const keywords = ["reflection"];
    const result = extractMatchingSentences(text, keywords);
    expect(result).toHaveLength(2);
  });

  it("추출된 문장의 앞뒤 공백을 제거한다", () => {
    const text = "  Affect was studied.  The results were clear.  ";
    const keywords = ["affect"];
    const result = extractMatchingSentences(text, keywords);
    expect(result[0]).toBe("Affect was studied.");
  });
});
