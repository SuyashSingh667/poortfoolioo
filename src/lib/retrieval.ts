import fs from "fs";
import path from "path";

type Chunk = {
  id: string;
  text: string;
  meta: Record<string, any>;
  embedding: number[];
};

let cache: Chunk[] | null = null;

function loadChunks(): Chunk[] {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "data", "persona-embedded.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cache = JSON.parse(raw);
  return cache!;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function getTopMatches(queryEmbedding: number[], topN = 5) {
  const chunks = loadChunks();
  return chunks
    .map((c) => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
