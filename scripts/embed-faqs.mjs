// Run this once (and again whenever data/persona-knowledge.json changes):
//   node --env-file=.env.local scripts/embed-faqs.mjs
//
// Reads data/persona-knowledge.json (496 heterogeneous persona objects),
// normalizes each into embeddable text, calls Gemini's embedding model,
// and writes data/persona-embedded.json for the chat route to use at runtime.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalize } from "./normalize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY. Add it to .env.local first.");
  process.exit(1);
}

const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${API_KEY}`;

async function embed(text) {
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-2",
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

// Simple delay so we don't slam the free-tier rate limit
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const inputPath = path.join(ROOT, "data", "persona-knowledge.json");
  const outputPath = path.join(ROOT, "data", "persona-embedded.json");

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  console.log(`Loaded ${raw.length} raw persona objects.`);

  const chunks = raw.map((obj, i) => normalize(obj, i)).filter((c) => c.text && c.text.trim().length > 0);
  console.log(`Normalized into ${chunks.length} embeddable chunks.`);

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const embedding = await embed(chunk.text);
      results.push({ ...chunk, embedding });
      process.stdout.write(`\rEmbedded ${i + 1}/${chunks.length}`);
    } catch (err) {
      console.error(`\nFailed on chunk ${chunk.id}:`, err.message);
    }
    // Gentle pacing — free tier is ~1500 req/day but has per-minute limits too
    await sleep(150);
  }

  fs.writeFileSync(outputPath, JSON.stringify(results));
  console.log(`\nDone. Wrote ${results.length} embedded chunks to data/persona-embedded.json`);
}

main();
