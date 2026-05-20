import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const EDUCATION_OFFICE_CODES = [
  "B10",
  "C10",
  "D10",
  "E10",
  "F10",
  "G10",
  "H10",
  "I10",
  "J10",
  "K10",
  "M10",
  "N10",
  "P10",
  "Q10",
  "R10",
  "S10",
  "T10"
];

const key = process.env.NEIS_API_KEY;
const outputDir = join(process.cwd(), "data");

if (!key) {
  console.error("NEIS_API_KEY is required.");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

async function fetchWithRetry(url, retry = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retry; attempt += 1) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      await sleep(700 * attempt);
    }
  }

  throw lastError;
}

function rowsFromPayload(payload, rootKey) {
  if (payload.RESULT) {
    if (payload.RESULT.CODE === "INFO-200") {
      return { total: 0, rows: [] };
    }
    throw new Error(`${payload.RESULT.CODE}: ${payload.RESULT.MESSAGE}`);
  }

  const root = payload[rootKey];
  const head = root?.find((entry) => entry.head)?.head ?? [];
  const total = head.find((entry) => entry.list_total_count)?.list_total_count ?? 0;
  const rows = root?.find((entry) => entry.row)?.row ?? [];
  return { total, rows };
}

async function collectEndpoint({ endpoint, rootKey, outputFile }) {
  const filePath = join(outputDir, outputFile);
  const stream = createWriteStream(filePath, { flags: "w" });
  const seen = new Set();
  let written = 0;

  try {
    for (const officeCode of EDUCATION_OFFICE_CODES) {
      let page = 1;
      let total = 1;

      while ((page - 1) * 1000 < total) {
        const url = new URL(`https://open.neis.go.kr/hub/${endpoint}`);
        url.searchParams.set("KEY", key);
        url.searchParams.set("Type", "json");
        url.searchParams.set("pIndex", String(page));
        url.searchParams.set("pSize", "1000");
        url.searchParams.set("ATPT_OFCDC_SC_CODE", officeCode);

        const payload = await fetchWithRetry(url);
        const result = rowsFromPayload(payload, rootKey);
        total = result.total;

        for (const row of result.rows) {
          const uniqueKey =
            endpoint === "acaInsTiInfo"
              ? `${row.ATPT_OFCDC_SC_CODE}:${row.ACA_ASNUM}`
              : `${row.ATPT_OFCDC_SC_CODE}:${row.SD_SCHUL_CODE}`;

          if (seen.has(uniqueKey)) {
            continue;
          }

          seen.add(uniqueKey);
          stream.write(JSON.stringify({ source: endpoint, officeCode, row }) + "\n");
          written += 1;
        }

        console.log(`${endpoint} ${officeCode} page ${page} rows ${result.rows.length}`);
        page += 1;
        await sleep(500);
      }
    }
  } finally {
    stream.end();
  }

  console.log(`Wrote ${written} rows to ${filePath}`);
}

await collectEndpoint({
  endpoint: "acaInsTiInfo",
  rootKey: "acaInsTiInfo",
  outputFile: "neis-academies.jsonl"
});

await collectEndpoint({
  endpoint: "schoolInfo",
  rootKey: "schoolInfo",
  outputFile: "neis-schools.jsonl"
});

console.log(`Collection complete: ${dirname(join(outputDir, "done"))}`);
