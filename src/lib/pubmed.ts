import { Hypothesis, PaperMetadata } from "../types.js";

const ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

const API_KEY = process.env.NCBI_API_KEY || "";

export const HYPOTHESIS_QUERIES: Record<Hypothesis, string> = {
  emotion_as_information:
    '"affect as information" OR "emotion action tendency" OR "emotion decision making"',
  small_actions_self_efficacy:
    '"self-efficacy" OR "micro-goals" OR "implementation intentions" OR "small steps behavior change"',
  reflection_pattern_recognition:
    '"emotional self-regulation" OR "self-monitoring emotion" OR "reflective practice" OR "emotion pattern recognition"',
};

export const POPULATION_FILTERS: Record<string, string> = {
  adhd: ' AND "ADHD"',
  anxiety_disorder: ' AND "anxiety disorder"',
  depression: ' AND ("depression" OR "depressive disorder")',
  adhd_with_anxiety_or_depression:
    ' AND "ADHD" AND ("anxiety" OR "depression")',
};

const HYPOTHESIS_KEYWORDS: Record<Hypothesis, string[]> = {
  emotion_as_information: [
    "affect",
    "emotion regulation",
    "emotional information",
    "appraisal",
    "action tendency",
    "affect as information",
    "emotion decision",
    "emotional processing",
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
  ],
};

export const HYPOTHESIS_MESH_TERMS: Record<Hypothesis, string[]> = {
  emotion_as_information: [
    "Emotions",
    "Affect",
    "Emotional Regulation",
    "Decision Making",
    "Judgment",
    "Mood Disorders",
    "Affective Symptoms",
    "Emotional Intelligence",
    "Appraisal",
  ],
  small_actions_self_efficacy: [
    "Self Efficacy",
    "Goals",
    "Intention",
    "Behavior Therapy",
    "Motivation",
    "Task Performance and Analysis",
    "Health Behavior",
    "Habits",
    "Self-Management",
  ],
  reflection_pattern_recognition: [
    "Self-Assessment",
    "Metacognition",
    "Writing",
    "Self Report",
    "Awareness",
    "Diaries as Topic",
    "Mindfulness",
    "Self Concept",
    "Cognitive Behavioral Therapy",
  ],
};

interface SearchOptions {
  yearFrom?: number;
  yearTo?: number;
  maxResults?: number;
  population?: string;
}

function buildApiParams(params: Record<string, string>): URLSearchParams {
  const searchParams = new URLSearchParams(params);
  if (API_KEY) {
    searchParams.set("api_key", API_KEY);
  }
  return searchParams;
}

export async function searchPubMed(
  query: string,
  options: SearchOptions = {}
): Promise<string[]> {
  const { yearFrom, yearTo, maxResults = 10 } = options;

  const params: Record<string, string> = {
    db: "pubmed",
    term: query,
    retmax: String(maxResults),
    retmode: "json",
  };

  if (yearFrom) {
    params.mindate = `${yearFrom}/01/01`;
    params.datetype = "pdat";
  }
  if (yearTo) {
    params.maxdate = `${yearTo}/12/31`;
    params.datetype = "pdat";
  }

  const url = `${ESEARCH_URL}?${buildApiParams(params).toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubMed esearch failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    esearchresult?: { idlist?: string[] };
  };

  return data.esearchresult?.idlist ?? [];
}

export async function fetchPaperDetails(
  pmids: string[]
): Promise<PaperMetadata[]> {
  if (pmids.length === 0) return [];

  // Fetch all data via efetch (XML) — more reliable than esummary
  const fetchParams: Record<string, string> = {
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml",
  };

  const fetchUrl = `${EFETCH_URL}?${buildApiParams(fetchParams).toString()}`;
  const fetchResponse = await fetch(fetchUrl);

  if (!fetchResponse.ok) {
    throw new Error(
      `PubMed efetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`
    );
  }

  const xmlText = await fetchResponse.text();
  return parseArticlesFromXml(xmlText);
}

function extractTagContent(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

function parseArticlesFromXml(xml: string): PaperMetadata[] {
  const results: PaperMetadata[] = [];
  const articleRegex = /<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g;
  let articleMatch: RegExpExecArray | null;

  while ((articleMatch = articleRegex.exec(xml)) !== null) {
    const article = articleMatch[0];

    // PMID
    const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmidMatch) continue;
    const pmid = pmidMatch[1];

    // Title
    const title = extractTagContent(article, "ArticleTitle");

    // Authors
    const authors: string[] = [];
    const authorRegex = /<Author[^>]*>[\s\S]*?<\/Author>/g;
    let authorMatch: RegExpExecArray | null;
    while ((authorMatch = authorRegex.exec(article)) !== null) {
      const lastName = extractTagContent(authorMatch[0], "LastName");
      const initials = extractTagContent(authorMatch[0], "Initials");
      if (lastName) {
        authors.push(initials ? `${lastName} ${initials}` : lastName);
      }
    }

    // Journal
    const journal = extractTagContent(article, "Title") || extractTagContent(article, "ISOAbbreviation");

    // Year
    const pubDateBlock = article.match(/<PubDate>([\s\S]*?)<\/PubDate>/);
    let year = 0;
    if (pubDateBlock) {
      const yearStr = extractTagContent(pubDateBlock[1], "Year");
      year = yearStr ? parseInt(yearStr, 10) || 0 : 0;
    }

    // DOI
    let doi: string | undefined;
    const doiMatch = article.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
    if (doiMatch) {
      doi = doiMatch[1].trim();
    }

    // Abstract
    let abstractText = "";
    const abstractMatch = article.match(/<Abstract>([\s\S]*?)<\/Abstract>/);
    if (abstractMatch) {
      const textParts: string[] = [];
      const textRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
      let textMatch: RegExpExecArray | null;
      while ((textMatch = textRegex.exec(abstractMatch[1])) !== null) {
        textParts.push(textMatch[1].replace(/<[^>]+>/g, "").trim());
      }
      abstractText = textParts.join(" ");
    }

    // MeSH terms
    const meshTerms = parseMeshTerms(article);

    // Classify using both keywords and MeSH terms
    const hypothesisTags = classifyCombined(`${title} ${abstractText}`, meshTerms);
    const summary = abstractText
      ? abstractText.split(/\.\s/)[0] + "."
      : title;

    results.push({
      pmid,
      title,
      authors,
      journal,
      year,
      doi,
      abstract: abstractText,
      meshTerms,
      hypothesisTags,
      summary,
    });
  }

  return results;
}

export function classifyByKeywords(text: string): Hypothesis[] {
  const lowerText = text.toLowerCase();
  const tags: Hypothesis[] = [];

  for (const [hypothesis, keywords] of Object.entries(HYPOTHESIS_KEYWORDS)) {
    const matched = keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
    if (matched) {
      tags.push(hypothesis as Hypothesis);
    }
  }

  return tags;
}

export function classifyByMeshTerms(meshTerms: string[]): Hypothesis[] {
  const tags: Hypothesis[] = [];
  const normalizedTerms = meshTerms.map((t) => t.toLowerCase());

  for (const [hypothesis, targetTerms] of Object.entries(HYPOTHESIS_MESH_TERMS)) {
    const matched = targetTerms.some((target) =>
      normalizedTerms.some((term) => term.includes(target.toLowerCase()))
    );
    if (matched) {
      tags.push(hypothesis as Hypothesis);
    }
  }

  return tags;
}

export function classifyCombined(
  text: string,
  meshTerms: string[]
): Hypothesis[] {
  const keywordTags = classifyByKeywords(text);
  const meshTags = classifyByMeshTerms(meshTerms);
  const combined = new Set([...keywordTags, ...meshTags]);
  return [...combined];
}

export function parseMeshTerms(articleXml: string): string[] {
  const terms: string[] = [];
  const meshRegex = /<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g;
  let match: RegExpExecArray | null;

  while ((match = meshRegex.exec(articleXml)) !== null) {
    terms.push(match[1].trim());
  }

  return terms;
}

export async function searchByDoi(doi: string): Promise<string[]> {
  const query = `${doi}[doi]`;
  return searchPubMed(query, { maxResults: 1 });
}
