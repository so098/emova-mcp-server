export type Hypothesis =
  | "emotion_as_information"
  | "small_actions_self_efficacy"
  | "reflection_pattern_recognition";

export type Population =
  | "general"
  | "adhd"
  | "anxiety_disorder"
  | "depression"
  | "adhd_with_anxiety_or_depression";

export interface PaperMetadata {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  abstract: string;
  meshTerms: string[];
  hypothesisTags: Hypothesis[];
  summary: string;
}
