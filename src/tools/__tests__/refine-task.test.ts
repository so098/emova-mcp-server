import { describe, it, expect } from "vitest";
import { findBestMapping } from "../refine-task.js";

describe("findBestMapping", () => {
  it("무기력 감정에 대해 무기력 매핑을 반환한다", () => {
    const mapping = findBestMapping("무기력해요");
    expect(mapping.emotionPatterns).toContain("무기력");
    expect(mapping.suggestedActions.length).toBeGreaterThan(0);
  });

  it("불안 감정에 대해 불안 매핑을 반환한다", () => {
    const mapping = findBestMapping("불안하고 걱정돼요");
    expect(mapping.emotionPatterns).toContain("불안");
  });

  it("자책 감정에 대해 자책 매핑을 반환한다", () => {
    const mapping = findBestMapping("자책감이 들어요");
    expect(mapping.emotionPatterns).toContain("자책");
  });

  it("슬픔 감정에 대해 슬픔 매핑을 반환한다", () => {
    const mapping = findBestMapping("슬픔을 느껴요");
    expect(mapping.emotionPatterns).toContain("슬픔");
  });

  it("피곤 감정에 대해 피로 매핑을 반환한다", () => {
    const mapping = findBestMapping("너무 피곤해요");
    expect(mapping.emotionPatterns).toContain("피곤");
  });

  it("걱정 감정에 대해 걱정 매핑을 반환한다", () => {
    const mapping = findBestMapping("걱정이 많아요");
    expect(mapping.emotionPatterns).toContain("걱정");
  });

  it("외로움 감정에 대해 외로움 매핑을 반환한다", () => {
    const mapping = findBestMapping("외로워요");
    expect(mapping.emotionPatterns).toContain("외로");
  });

  it("인식할 수 없는 감정에는 기본값(무기력) 매핑을 반환한다", () => {
    const mapping = findBestMapping("some random text");
    // 기본값은 첫 번째 매핑 (무기력)
    expect(mapping.emotionPatterns).toContain("무기력");
  });

  it("반환된 매핑에 ifThenTemplate이 포함되어 있다", () => {
    const mapping = findBestMapping("불안해요");
    expect(mapping.ifThenTemplate).toBeDefined();
    expect(mapping.ifThenTemplate.length).toBeGreaterThan(0);
  });

  it("반환된 매핑에 rationale이 포함되어 있다", () => {
    const mapping = findBestMapping("자책감");
    expect(mapping.rationale).toBeDefined();
    expect(mapping.rationale.length).toBeGreaterThan(0);
  });

  it("감정 매칭 시 대소문자를 구분하지 않는다", () => {
    // 한국어는 대소문자가 없지만, toLowerCase가 문제를 일으키지 않는지 확인
    const mapping = findBestMapping("무기력");
    expect(mapping.emotionPatterns).toContain("무기력");
  });
});
