import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_DUMP =
  "/Users/kim-yonghun/Development/DaedongHakwondo/hakwon-nono/setup/hakwonnono.dump";
const OUTPUT = resolve(process.cwd(), "src/lib/generated-dump-data.ts");
const JSON_OUTPUT = resolve(process.cwd(), "src/lib/generated-dump-data.json");
const ACADEMY_UNIVERSE_OUTPUT = resolve(
  process.cwd(),
  "src/lib/generated-academy-universe.json"
);
const DUMP_PATH = process.env.HAKWONNONO_DUMP ?? DEFAULT_DUMP;
const ACADEMIES_PER_SCHOOL = 25;

const PG_RESTORE_CANDIDATES = [
  process.env.PG_RESTORE,
  "/opt/homebrew/Cellar/postgresql@17/17.9/bin/pg_restore",
  "/opt/homebrew/Cellar/libpq/18.3/bin/pg_restore",
  "/opt/homebrew/bin/pg_restore"
].filter(Boolean);

const OFFICE_REGIONS = {
  B10: "서울특별시",
  C10: "부산광역시",
  D10: "대구광역시",
  E10: "인천광역시",
  F10: "광주광역시",
  G10: "대전광역시",
  H10: "울산광역시",
  I10: "세종특별자치시",
  J10: "경기도",
  K10: "강원특별자치도",
  M10: "충청북도",
  N10: "충청남도",
  P10: "전북특별자치도",
  Q10: "전라남도",
  R10: "경상북도",
  S10: "경상남도",
  T10: "제주특별자치도"
};

const REGION_ALIASES = {
  서울: "서울특별시",
  서울시: "서울특별시",
  서울특별시: "서울특별시",
  부산: "부산광역시",
  부산시: "부산광역시",
  부산광역시: "부산광역시",
  대구: "대구광역시",
  대구시: "대구광역시",
  대구광역시: "대구광역시",
  인천: "인천광역시",
  인천시: "인천광역시",
  인천광역시: "인천광역시",
  광주: "광주광역시",
  광주시: "광주광역시",
  광주광역시: "광주광역시",
  대전: "대전광역시",
  대전시: "대전광역시",
  대전광역시: "대전광역시",
  울산: "울산광역시",
  울산시: "울산광역시",
  울산광역시: "울산광역시",
  세종: "세종특별자치시",
  세종시: "세종특별자치시",
  세종특별자치시: "세종특별자치시",
  경기: "경기도",
  경기도: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  강원특별자치도: "강원특별자치도",
  충북: "충청북도",
  충청북도: "충청북도",
  충남: "충청남도",
  충청남도: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전북특별자치도: "전북특별자치도",
  전남: "전라남도",
  전라남도: "전라남도",
  경북: "경상북도",
  경상북도: "경상북도",
  경남: "경상남도",
  경상남도: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
  제주특별자치도: "제주특별자치도"
};

function findPgRestore() {
  const found = PG_RESTORE_CANDIDATES.find((candidate) => candidate && existsSync(candidate));
  if (!found) {
    throw new Error("pg_restore 17+ not found. Set PG_RESTORE=/path/to/pg_restore.");
  }
  return found;
}

function restoreTable(table) {
  const pgRestore = findPgRestore();
  return execFileSync(pgRestore, ["-f", "-", "-a", "-t", table, DUMP_PATH], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024
  });
}

function parseCopy(sql, table) {
  const copyPrefix = `COPY public.${table} (`;
  const lines = sql.split("\n");
  const start = lines.findIndex((line) => line.startsWith(copyPrefix));
  if (start === -1) {
    throw new Error(`COPY block not found for ${table}`);
  }

  const columns = lines[start]
    .slice(copyPrefix.length, lines[start].indexOf(") FROM stdin;"))
    .split(", ")
    .map((column) => column.trim());

  const rows = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "\\.") {
      break;
    }
    if (!line) {
      continue;
    }

    const values = line.split("\t").map((value) => (value === "\\N" ? null : value));
    const row = {};
    columns.forEach((column, columnIndex) => {
      row[column] = values[columnIndex] ?? null;
    });
    rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  if (value == null || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseAddress(address, educationOfficeCode) {
  const parts = (address ?? "").split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "미상";
  const normalizedRegion = REGION_ALIASES[first];
  if (normalizedRegion) {
    return {
      region: normalizedRegion,
      district: parts[1] ?? "미상"
    };
  }

  const officeRegion = OFFICE_REGIONS[educationOfficeCode];
  if (officeRegion) {
    return {
      region: officeRegion,
      district: first
    };
  }

  return {
    region: first,
    district: parts[1] ?? "미상"
  };
}

function groupRealm(realm, subject = "") {
  const value = `${realm ?? ""} ${subject ?? ""}`;
  if (/국제화|외국어|영어/.test(value)) return "외국어";
  if (/입시|검정|보습|수학|국어|과학|사회/.test(value)) return "학습/입시";
  if (/예능|음악|미술|무용|기예/.test(value)) return "예체능";
  if (/정보|컴퓨터|코딩|소프트웨어/.test(value)) return "코딩/IT";
  if (/독서실/.test(value)) return "독서실";
  if (/직업|기술|자격/.test(value)) return "직업/자격";
  if (/논술|사고력|인문/.test(value)) return "사고력/논술";
  return "기타";
}

function normalizeSchool(row) {
  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);
  if (latitude == null || longitude == null) {
    return null;
  }

  const { region, district } = parseAddress(row.address, row.atpt_ofcdc_sc_code);

  return {
    id: row.id,
    neisSchoolId: row.sd_schul_code,
    educationOfficeCode: row.atpt_ofcdc_sc_code,
    name: row.school_nm,
    kind: row.school_kind ?? "학교",
    region,
    district,
    address: row.address ?? "",
    studentCount: estimateStudentCount(row.school_kind),
    publicSupportSlots: 0,
    coordinate: { lat: latitude, lng: longitude }
  };
}

function normalizeAcademy(row) {
  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);
  if (latitude == null || longitude == null) {
    return null;
  }

  const monthlyFee = toNumber(row.tuition_fee);
  const realm = row.realm_sc_nm ?? "미분류";
  const { region, district } = parseAddress(row.address, row.atpt_ofcdc_sc_code);

  return {
    id: row.id,
    neisAcademyId: row.aca_asnum,
    educationOfficeCode: row.atpt_ofcdc_sc_code,
    name: row.academy_nm,
    academyType: row.academy_type ?? "학원",
    realm,
    group: groupRealm(realm, row.le_subject_nm),
    course: row.le_crse_nm ?? row.le_ord_nm ?? "",
    subject: row.le_subject_nm ?? "",
    capacity: toNumber(row.capacity),
    monthlyFee,
    feeDisclosed: monthlyFee != null,
    address: row.address ?? "",
    status: normalizeStatus(row.reg_status),
    establishedAt: normalizeDate(row.established_date),
    closedAt: normalizeDate(row.closed_date),
    sourceUpdatedAt: "2026-03-22",
    region,
    district,
    coordinate: { lat: latitude, lng: longitude }
  };
}

function normalizeStatus(status) {
  if (status === "개원" || status === "등록") return "등록";
  if (status?.includes("폐")) return "폐원";
  if (status?.includes("휴")) return "휴원";
  return "등록";
}

function normalizeDate(value) {
  if (!value || value.trim() === "" || value === "99991231") {
    return null;
  }
  const clean = value.trim();
  if (!/^\d{8}$/.test(clean)) {
    return null;
  }
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

function estimateStudentCount(kind) {
  if (kind?.includes("초")) return 520;
  if (kind?.includes("중")) return 610;
  if (kind?.includes("고")) return 680;
  return 300;
}

function distanceKm(a, b) {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function pickSchools(schools, maxPerRegion = 35) {
  const byRegion = new Map();
  for (const school of schools) {
    const key = school.region;
    if (!byRegion.has(key)) byRegion.set(key, []);
    byRegion.get(key).push(school);
  }

  const selected = [];
  for (const regionSchools of byRegion.values()) {
    const sorted = regionSchools.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    const step = Math.max(1, Math.floor(sorted.length / maxPerRegion));
    for (let index = 0; index < sorted.length && selected.length < 700; index += step) {
      selected.push(sorted[index]);
      if (selected.filter((school) => school.region === sorted[index].region).length >= maxPerRegion) {
        break;
      }
    }
  }

  return selected.sort((a, b) => `${a.region}${a.district}${a.name}`.localeCompare(`${b.region}${b.district}${b.name}`, "ko"));
}

function academyKey(academy) {
  return academy.id;
}

function pickAcademiesNearSchools(academies, schools) {
  const selected = new Map();
  const academiesByRegion = new Map();
  for (const academy of academies) {
    const region = parseAddress(academy.address, academy.educationOfficeCode).region;
    if (!academiesByRegion.has(region)) academiesByRegion.set(region, []);
    academiesByRegion.get(region).push(academy);
  }

  for (const school of schools) {
    const candidates = academiesByRegion.get(school.region) ?? academies;
    const nearby = candidates
      .map((academy) => ({
        academy,
        distance: distanceKm(school.coordinate, academy.coordinate)
      }))
      .filter((entry) => entry.distance <= 2.5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, ACADEMIES_PER_SCHOOL);

    for (const entry of nearby) {
      selected.set(academyKey(entry.academy), entry.academy);
    }
  }

  return Array.from(selected.values());
}

function main() {
  if (!existsSync(DUMP_PATH)) {
    throw new Error(`Dump file not found: ${DUMP_PATH}`);
  }

  const rawSchools = parseCopy(restoreTable("schools"), "schools");
  const rawAcademies = parseCopy(restoreTable("academies"), "academies");
  const allSchools = rawSchools.map(normalizeSchool).filter(Boolean);
  const allAcademies = rawAcademies.map(normalizeAcademy).filter(Boolean);
  const selectedSchools = pickSchools(allSchools);
  const selectedAcademies = pickAcademiesNearSchools(allAcademies, selectedSchools);
  const generated = {
    importedDataMeta: {
      source: DUMP_PATH,
      importedAt: new Date().toISOString(),
      totalSchools: allSchools.length,
      totalAcademies: allAcademies.length,
      selectedSchools: selectedSchools.length,
      selectedAcademies: selectedAcademies.length
    },
    importedSchoolDirectory: allSchools.sort((a, b) =>
      `${a.region}${a.district}${a.name}`.localeCompare(
        `${b.region}${b.district}${b.name}`,
        "ko"
      )
    ),
    importedSchools: selectedSchools,
    importedAcademies: selectedAcademies
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(JSON_OUTPUT, `${JSON.stringify(generated)}\n`);
  writeFileSync(
    ACADEMY_UNIVERSE_OUTPUT,
    `${JSON.stringify({ importedAcademyUniverse: allAcademies })}\n`
  );
  writeFileSync(
    OUTPUT,
    `import type { Academy, School } from "@/lib/types";\n` +
      `import generatedData from "./generated-dump-data.json";\n\n` +
      `type GeneratedDumpData = {\n` +
      `  importedDataMeta: {\n` +
      `    source: string;\n` +
      `    importedAt: string;\n` +
      `    totalSchools: number;\n` +
      `    totalAcademies: number;\n` +
      `    selectedSchools: number;\n` +
      `    selectedAcademies: number;\n` +
      `  };\n` +
      `  importedSchoolDirectory: School[];\n` +
      `  importedSchools: School[];\n` +
      `  importedAcademies: Academy[];\n` +
      `};\n\n` +
      `const typedGeneratedData = generatedData as GeneratedDumpData;\n\n` +
      `export const importedDataMeta = typedGeneratedData.importedDataMeta;\n` +
      `export const importedSchoolDirectory: School[] = typedGeneratedData.importedSchoolDirectory;\n` +
      `export const importedSchools: School[] = typedGeneratedData.importedSchools;\n` +
      `export const importedAcademies: Academy[] = typedGeneratedData.importedAcademies;\n`
  );

  console.log(
    `Imported ${selectedSchools.length}/${allSchools.length} schools and ${selectedAcademies.length}/${allAcademies.length} academies`
  );
}

main();
