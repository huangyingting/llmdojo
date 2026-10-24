import fs from "node:fs";
import path from "node:path";

export interface DojoPageRecord {
  title: string;
  description: string;
  tree: unknown;
}

let cachedPagesMap: Record<string, DojoPageRecord> | null = null;

function getPagesMap(): Record<string, DojoPageRecord> {
  if (!cachedPagesMap) {
    const filePath = path.join(process.cwd(), "src", "data", "dojo-pages.json");
    cachedPagesMap = JSON.parse(
      fs.readFileSync(filePath, "utf8")
    ) as Record<string, DojoPageRecord>;
  }
  return cachedPagesMap;
}

export const CURRICULUM_MODULES = new Set([
  "model-foundations",
  "prompt-context-engineering",
  "retrieval-knowledge-systems",
  "agents-harness-engineering",
  "evaluation-experimentation",
  "inference-optimization",
  "production-ai-systems",
]);

export function normalizeDojoRoutePath(rawPath: string): string {
  const pagesMap = getPagesMap();
  const clean = rawPath.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (pagesMap[clean]) {
    return clean;
  }
  const learnCandidate = "/learn" + (clean.startsWith("/") ? clean : "/" + clean);
  if (pagesMap[learnCandidate]) {
    return learnCandidate;
  }
  if (clean.startsWith("/interview/q/")) {
    const slug = clean.slice("/interview/q/".length).toLowerCase();
    const words = slug.split("-").filter((w) => w.length > 2);
    let bestRoute: string | null = null;
    let bestScore = 0;
    for (const candidate of Object.keys(pagesMap)) {
      if (!candidate.startsWith("/interview/q/")) continue;
      if (candidate.startsWith(clean)) return candidate;
      let score = 0;
      for (const w of words) {
        if (candidate.includes(w)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRoute = candidate;
      }
    }
    if (bestRoute && bestScore >= 2) {
      return bestRoute;
    }
  }
  return clean;
}

export function getDojoPage(rawPath: string): DojoPageRecord | null {
  const pagesMap = getPagesMap();
  const normalized = normalizeDojoRoutePath(rawPath);
  return pagesMap[normalized] ?? null;
}

export function getAllDojoRoutePaths(): string[] {
  return Object.keys(getPagesMap());
}
