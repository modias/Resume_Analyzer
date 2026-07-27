export interface ResumeEntry {
  type: "entry";
  title: string;
  subtitle: string;
  location: string;
  date: string;
  bullets: string[];
}

export interface ResumeProject {
  type: "project";
  name: string;
  tech: string;
  date: string;
  bullets: string[];
}

export interface ResumeSkills {
  type: "skills";
  text: string;
}

export type ResumeSectionEntry = ResumeEntry | ResumeProject | ResumeSkills;

export interface ResumeSection {
  title: string;
  entries: ResumeSectionEntry[];
}

export interface StructuredResume {
  name: string;
  contact: string;
  sections: ResumeSection[];
}

interface LogicalLine {
  text: string;
  rawStartsWithBullet: boolean;
}

const MONTH =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

const MONTH_DATE = `(?:${MONTH})\\.?\\s*\\d{4}`;

export const DATE_PATTERN = new RegExp(
  `${MONTH_DATE}\\s*[–—\\-]\\s*(?:${MONTH_DATE}|Present|Current)` +
    `|${MONTH_DATE}\\s+(?:Present|Current)` +
    `|(?:Present|Current)\\s*[–—\\-]?\\s*${MONTH_DATE}` +
    `|\\d{4}\\s*[–—\\-]\\s*(?:\\d{4}|Present|Current)` +
    `|${MONTH_DATE}`,
  "i"
);

const SECTION_SUFFIX_RE =
  /\b(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|SUMMARY|OBJECTIVE|PROFILE|CERTIFICATIONS|CERTIFICATION|AWARDS|HONORS|LEADERSHIP|ACTIVITIES|INVOLVEMENT|INTERESTS|REFERENCES|QUALIFICATIONS|PUBLICATIONS|VOLUNTEER)\b/i;

const SECTION_TITLE_RE =
  /^(education|experience|work experience|professional experience|employment|technical skills|core competencies|skills|projects|personal projects|summary|professional summary|objective|profile|volunteer experience|volunteer|leadership|certifications|awards|honors|activities|extracurricular|involvement|publications|interests|references)$/i;

const LOCATION_SUFFIX_RE = /,\s*[A-Z]{2}(?:\s|$)/;

function hasDate(line: string): boolean {
  return DATE_PATTERN.test(line);
}

function isBulletRaw(line: string): boolean {
  return /^[•\-–*◦▪]/.test(line.trim());
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^[•\-–*◦▪]\s*/, "");
}

function isBulletLine(line: LogicalLine): boolean {
  return line.rawStartsWithBullet || isBulletRaw(line.text);
}

function looksLikeLocation(line: string): boolean {
  return LOCATION_SUFFIX_RE.test(line) || /^Remote$/i.test(line.trim());
}

function shouldMergeWrappedLines(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  if (isSectionHeader(next) || hasDate(next) || isBulletRaw(next)) return false;
  if (/^[a-z("(]/.test(next)) return true;
  if (/[—\-,:]$/.test(prev.trim())) return true;
  if (prev.length > 55) return true;
  return false;
}

function reassembleChunk(lines: string[]): LogicalLine[] {
  const result: LogicalLine[] = [];
  let buffer = "";
  let bufferRawBullet = false;

  const flush = () => {
    if (!buffer) return;
    result.push({ text: buffer, rawStartsWithBullet: bufferRawBullet });
    buffer = "";
    bufferRawBullet = false;
  };

  for (const line of lines) {
    const lineIsBullet = isBulletRaw(line);

    if (looksLikeLocation(line) && !lineIsBullet) {
      flush();
      result.push({ text: line, rawStartsWithBullet: false });
      continue;
    }

    if (lineIsBullet) {
      flush();
      buffer = line;
      bufferRawBullet = true;
      if (/[.:]$/.test(line)) flush();
      continue;
    }

    if (hasDate(line)) {
      if (buffer) {
        result.push({ text: buffer, rawStartsWithBullet: bufferRawBullet });
        buffer = "";
        bufferRawBullet = false;
      }
      result.push({ text: line, rawStartsWithBullet: false });
      continue;
    }

    if (buffer && bufferRawBullet) {
      buffer = `${buffer} ${line}`;
      if (/[.:]$/.test(buffer)) flush();
      continue;
    }

    if (buffer) {
      if (shouldMergeWrappedLines(buffer, line)) {
        buffer = `${buffer} ${line}`;
      } else {
        flush();
        buffer = line;
      }
    } else {
      buffer = line;
    }

    if (
      /[.:]$/.test(buffer) ||
      looksLikeLocation(buffer) ||
      /^honors?:/i.test(buffer)
    ) {
      flush();
    }
  }

  flush();
  return result;
}

/** Phase 1 — merge PyMuPDF fragments into logical lines. */
export function reassembleLines(rawText: string): LogicalLine[] {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: LogicalLine[] = [];
  let chunk: string[] = [];

  const flushChunk = () => {
    if (chunk.length === 0) return;
    if (result.length === 0 && !chunk.some((l) => isSectionHeader(l))) {
      for (const line of chunk) {
        result.push({ text: line, rawStartsWithBullet: isBulletRaw(line) });
      }
    } else {
      result.push(...reassembleChunk(chunk));
    }
    chunk = [];
  };

  for (const line of rawLines) {
    if (isSectionHeader(line)) {
      flushChunk();
      result.push({ text: line, rawStartsWithBullet: false });
    } else {
      chunk.push(line);
    }
  }
  flushChunk();

  return result;
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length >= 40) return false;
  if (hasDate(trimmed)) return false;
  if (isBulletRaw(trimmed)) return false;
  if (/^honors?:/i.test(trimmed)) return false;

  if (SECTION_TITLE_RE.test(trimmed)) return true;

  const upper = trimmed.toUpperCase();
  if (upper === trimmed && SECTION_SUFFIX_RE.test(trimmed) && trimmed.split(/\s+/).length <= 5) {
    return true;
  }

  return false;
}

function isEntryTitle(line: string): boolean {
  return hasDate(line);
}

function isProjectEntry(line: string): boolean {
  if (!isEntryTitle(line)) return false;
  const beforeDate = stripDate(line);
  return /[|—]/.test(beforeDate) || /[|—]/.test(line);
}

function normalizeDateString(raw: string): string {
  const s = raw.trim().replace(/[–—]/g, " - ").replace(/\s+/g, " ");

  const presentFirst = s.match(
    new RegExp(`^(?:Present|Current)(?:\\s*-\\s*|\\s+)(${MONTH_DATE})$`, "i")
  );
  if (presentFirst) return `${presentFirst[1]} – Present`;

  const presentLast = s.match(
    new RegExp(`^(${MONTH_DATE})\\s*-\\s*(?:Present|Current)$`, "i")
  );
  if (presentLast) return `${presentLast[1]} – Present`;

  const rangeMatch = s.match(
    new RegExp(
      `(${MONTH_DATE})\\s*-\\s*(?:(${MONTH_DATE})|Present|Current)`,
      "i"
    )
  );
  if (rangeMatch) {
    const end = /present|current/i.test(rangeMatch[2] ?? "") ? "Present" : rangeMatch[2];
    return `${rangeMatch[1]} – ${end}`;
  }

  const yearRange = s.match(/^(\d{4})\s*-\s*(\d{4}|Present|Current)$/i);
  if (yearRange) {
    const end = /present|current/i.test(yearRange[2]) ? "Present" : yearRange[2];
    return `${yearRange[1]} – ${end}`;
  }

  return s.replace(/\s*-\s*/g, " – ").replace(/Current/gi, "Present");
}

function extractDate(line: string): string {
  const range = line.match(
    new RegExp(
      `${MONTH_DATE}\\s*[–—\\-]\\s*(?:${MONTH_DATE}|Present|Current)` +
        `|${MONTH_DATE}\\s+(?:Present|Current)` +
        `|(?:Present|Current)\\s*[–—\\-]?\\s*${MONTH_DATE}` +
        `|\\d{4}\\s*[–—\\-]\\s*(?:\\d{4}|Present|Current)`,
      "i"
    )
  );
  if (range) return normalizeDateString(range[0]);

  const single = line.match(new RegExp(MONTH_DATE, "i"));
  if (single) return normalizeDateString(single[0]);

  const yearOnly = line.match(/\d{4}\s*[–—\-]\s*(?:\d{4}|Present|Current)/i);
  if (yearOnly) return normalizeDateString(yearOnly[0]);

  return "";
}

function stripDate(line: string): string {
  let result = line;
  const patterns = [
    new RegExp(
      `${MONTH_DATE}\\s*[–—\\-]\\s*(?:${MONTH_DATE}|Present|Current)`,
      "i"
    ),
    new RegExp(`${MONTH_DATE}\\s+(?:Present|Current)`, "i"),
    new RegExp(`(?:Present|Current)\\s*[–—\\-]?\\s*${MONTH_DATE}`, "i"),
    /\d{4}\s*[–—\-]\s*(?:\d{4}|Present|Current)/i,
    new RegExp(MONTH_DATE, "i"),
  ];

  for (const pat of patterns) {
    const m = result.match(pat);
    if (m) {
      result = result.replace(m[0], "");
      break;
    }
  }

  return result
    .replace(/\s{2,}/g, " ")
    .replace(/^[–—\-|,\s]+/, "")
    .replace(/[|,\s]+$/, "")
    .trim();
}

function splitSubtitleLocation(line: string): { subtitle: string; location: string } {
  const cleaned = stripBulletPrefix(line);
  const locMatch = cleaned.match(/^(.+?)\s+([A-Za-z .'-]+,\s*[A-Z]{2}(?:\s|$).*)$/);
  if (locMatch) {
    return { subtitle: locMatch[1].trim(), location: locMatch[2].trim() };
  }

  const commaIdx = cleaned.lastIndexOf(",");
  if (commaIdx > 0 && LOCATION_SUFFIX_RE.test(cleaned.slice(commaIdx))) {
    return {
      subtitle: cleaned.slice(0, commaIdx).trim(),
      location: cleaned.slice(commaIdx + 1).trim(),
    };
  }

  return { subtitle: cleaned, location: "" };
}

function emptyEntry(): ResumeEntry {
  return {
    type: "entry",
    title: "",
    subtitle: "",
    location: "",
    date: "",
    bullets: [],
  };
}

function emptyProject(): ResumeProject {
  return { type: "project", name: "", tech: "", date: "", bullets: [] };
}

function hasBullets(
  entry: ResumeSectionEntry
): entry is ResumeEntry | ResumeProject {
  return entry.type === "entry" || entry.type === "project";
}

function looksLikeDegree(line: string): boolean {
  return /\b(Bachelor|Master|Doctor|B\.?\s*S\.?|M\.?\s*S\.?|M\.?\s*A\.?|Ph\.?\s*D\.?|Associate|Degree|Diploma|Concentration|Major)\b/i.test(
    line
  );
}

function looksLikeInstitution(line: string): boolean {
  return /\b(University|College|Institute|School|Academy|Polytechnic)\b/i.test(line);
}

function assignEducationFields(entry: ResumeEntry, lines: string[]): void {
  const parts = [...lines];
  for (const part of parts) {
    if (!entry.title && looksLikeDegree(part)) entry.title = part;
    else if (!entry.subtitle && looksLikeInstitution(part)) entry.subtitle = part;
    else if (!entry.location && looksLikeLocation(part)) entry.location = part;
  }
  if (!entry.title && parts.length > 0) entry.title = parts.shift() ?? "";
  if (!entry.subtitle && parts.length > 0 && looksLikeInstitution(parts[0])) {
    entry.subtitle = parts.shift() ?? "";
  }
  if (!entry.location && parts.length > 0 && looksLikeLocation(parts[0])) {
    entry.location = parts.shift() ?? "";
  }
  if (!entry.subtitle && parts.length > 0) entry.subtitle = parts.shift() ?? "";
}

function parseExperienceEntry(
  line: string,
  pendingBefore: string[]
): ResumeEntry {
  const entry = emptyEntry();
  entry.date = extractDate(line);
  const remainder = stripDate(line);
  const parts = [...pendingBefore.filter(Boolean)];

  if (remainder) {
    parts.push(remainder);
  }

  if (parts.length === 0) {
    return entry;
  }

  if (parts.length === 1) {
    entry.title = parts[0];
    return entry;
  }

  if (parts.length === 2) {
    entry.title = parts[0];
    const { subtitle, location } = splitSubtitleLocation(parts[1]);
    entry.subtitle = subtitle;
    entry.location = location;
    return entry;
  }

  entry.title = parts[0];
  const tail = parts.slice(1);
  if (tail.length === 1) {
    const { subtitle, location } = splitSubtitleLocation(tail[0]);
    entry.subtitle = subtitle;
    entry.location = location;
  } else {
    const last = tail[tail.length - 1];
    if (looksLikeLocation(last)) {
      entry.location = last;
      entry.subtitle = tail.slice(0, -1).join(" ");
    } else {
      entry.subtitle = tail.join(" ");
    }
  }

  return entry;
}

function parseProjectEntry(line: string, pendingBefore: string[]): ResumeProject {
  const project = emptyProject();
  project.date = extractDate(line);
  const remainder = stripDate(line);
  const content = [...pendingBefore.filter(Boolean)];
  if (remainder) content.push(remainder);
  const joined = content.join(" ").replace(/\s+/g, " ").trim();

  if (content.includes("|")) {
    const pipeIdx = joined.indexOf("|");
    project.name = joined.slice(0, pipeIdx).trim();
    project.tech = joined.slice(pipeIdx + 1).trim();
  } else {
    const dashMatch = joined.match(/^(.+?)\s*[—–]\s*(.+)$/);
    if (dashMatch && !hasDate(dashMatch[2])) {
      project.name = dashMatch[1].trim();
      project.tech = dashMatch[2].trim();
    } else {
      project.name = joined;
    }
  }

  return project;
}

/** Phase 4 — bullet cleanup per entry. */
export function cleanBullets(bullets: string[]): string[] {
  const trimmed = bullets.map((b) => b.trim()).filter((b) => b.length >= 20);
  const out: string[] = [];

  for (const bullet of trimmed) {
    const norm = normalizeResumeText(bullet);
    let merged = false;
    for (let i = 0; i < out.length; i += 1) {
      const en = normalizeResumeText(out[i]);
      if (norm === en || en.includes(norm) || norm.includes(en)) {
        if (bullet.length > out[i].length) out[i] = bullet;
        merged = true;
        break;
      }
    }
    if (!merged) out.push(bullet);
  }

  return out;
}

/** Split skills blob on category headers: "Languages: Python SQL: ..." */
export function splitSkillCategoryLines(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/(?=\b[A-Z][^:]{0,48}:\s)/);
  const lines = parts.map((p) => p.trim()).filter(Boolean);
  return lines.length > 0 ? lines : [trimmed];
}

function isSkillsSection(title: string): boolean {
  return /skill|competenc|technolog/i.test(title);
}

function isSummarySection(title: string): boolean {
  return /summary|objective|profile/i.test(title);
}

function isProjectsSection(title: string): boolean {
  return /project/i.test(title);
}

function isEducationSection(title: string): boolean {
  return /education/i.test(title);
}

function appendProse(section: ResumeSection, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const last = section.entries[section.entries.length - 1];
  if (last?.type === "skills") {
    last.text = `${last.text} ${trimmed}`.trim();
  } else {
    section.entries.push({ type: "skills", text: trimmed });
  }
}

function finalizeEntries(sections: ResumeSection[]): void {
  for (const section of sections) {
    for (const entry of section.entries) {
      if (hasBullets(entry)) {
        entry.bullets = cleanBullets(entry.bullets);
      }
    }
  }
}

export function parseResumeToStructured(text: string): StructuredResume {
  const logical = reassembleLines(text);
  const result: StructuredResume = { name: "", contact: "", sections: [] };

  let i = 0;
  while (i < logical.length && !isSectionHeader(logical[i].text)) {
    const line = logical[i].text;
    if (!result.name) result.name = line;
    else if (!result.contact) result.contact = line;
    else result.contact = `${result.contact} ${line}`;
    i += 1;
  }

  let currentSection: ResumeSection | null = null;
  let currentEntry: ResumeEntry | ResumeProject | null = null;
  let awaitingSubtitle = false;
  let awaitingLocation = false;
  let pendingBeforeDate: string[] = [];

  const flushPendingIntoEntry = () => {
    if (pendingBeforeDate.length === 0) return;
    if (currentEntry?.type === "entry" && !currentEntry.title) {
      currentEntry.title = pendingBeforeDate.join(" ");
    }
    pendingBeforeDate = [];
  };

  while (i < logical.length) {
    const lineObj = logical[i];
    const line = lineObj.text;

    if (isSectionHeader(line)) {
      flushPendingIntoEntry();
      currentSection = { title: line, entries: [] };
      result.sections.push(currentSection);
      currentEntry = null;
      awaitingSubtitle = false;
      awaitingLocation = false;
      pendingBeforeDate = [];
      i += 1;
      continue;
    }

    if (!currentSection) {
      currentSection = { title: "Experience", entries: [] };
      result.sections.push(currentSection);
    }

    if (isSummarySection(currentSection.title)) {
      appendProse(currentSection, stripBulletPrefix(line));
      i += 1;
      continue;
    }

    if (isSkillsSection(currentSection.title)) {
      for (const chunk of splitSkillCategoryLines(line)) {
        currentSection.entries.push({ type: "skills", text: chunk });
      }
      i += 1;
      continue;
    }

    const treatAsProject =
      isProjectsSection(currentSection.title) ||
      isProjectEntry(line) ||
      (hasDate(line) && /[|—]/.test(line));

    if (isEntryTitle(line)) {
      pendingBeforeDate = pendingBeforeDate.filter(Boolean);

      if (treatAsProject) {
        const project = parseProjectEntry(line, pendingBeforeDate);
        pendingBeforeDate = [];
        currentSection.entries.push(project);
        currentEntry = project;
        awaitingSubtitle = false;
        awaitingLocation = false;
      } else {
        const entry = isEducationSection(currentSection.title)
          ? (() => {
              const e = emptyEntry();
              e.date = extractDate(line);
              assignEducationFields(e, [
                ...pendingBeforeDate,
                stripDate(line),
              ].filter(Boolean));
              return e;
            })()
          : parseExperienceEntry(line, pendingBeforeDate);

        pendingBeforeDate = [];
        currentSection.entries.push(entry);
        currentEntry = entry;
        awaitingSubtitle = !entry.subtitle;
        awaitingLocation = Boolean(entry.subtitle && !entry.location);
      }

      i += 1;
      continue;
    }

    if (awaitingSubtitle && currentEntry?.type === "entry") {
      const cleaned = stripBulletPrefix(line);
      currentEntry.subtitle = cleaned;
      awaitingSubtitle = false;
      awaitingLocation = !currentEntry.location;
      i += 1;
      continue;
    }

    if (awaitingLocation && currentEntry?.type === "entry") {
      if (isBulletLine(lineObj)) {
        awaitingLocation = false;
      } else {
        currentEntry.location = stripBulletPrefix(line);
        awaitingLocation = false;
        i += 1;
        continue;
      }
    }

    if (isBulletLine(lineObj)) {
      if (currentEntry && hasBullets(currentEntry)) {
        currentEntry.bullets.push(stripBulletPrefix(line));
      } else {
        pendingBeforeDate.push(stripBulletPrefix(line));
      }
      i += 1;
      continue;
    }

    if (/^honors?:/i.test(line) || /^gpa[:\s]/i.test(line)) {
      if (currentEntry?.type === "entry") {
        currentEntry.bullets.push(line);
      } else {
        pendingBeforeDate.push(line);
      }
      i += 1;
      continue;
    }

    if (currentEntry && hasBullets(currentEntry) && currentEntry.date && !awaitingSubtitle && !awaitingLocation) {
      currentEntry.bullets.push(stripBulletPrefix(line));
      i += 1;
      continue;
    }

    pendingBeforeDate.push(line);
    i += 1;
  }

  flushPendingIntoEntry();
  finalizeEntries(result.sections);
  return result;
}

/** Normalize text for fuzzy comparison (whitespace, quotes, dashes). */
export function normalizeResumeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function textSimilarity(a: string, b: string): number {
  const na = normalizeResumeText(a);
  const nb = normalizeResumeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    return Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
  }
  const wordsA = na.split(" ").filter(Boolean);
  const wordsB = new Set(nb.split(" ").filter(Boolean));
  if (wordsA.length === 0) return 0;
  const overlap = wordsA.filter((w) => wordsB.has(w)).length;
  return overlap / wordsA.length;
}

function collectTextCandidates(
  resumeText: string,
  structured: StructuredResume
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (t: string) => {
    const text = t.trim();
    if (text.length < 20) return;
    const key = normalizeResumeText(text);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(text);
  };

  for (const section of structured.sections) {
    for (const entry of section.entries) {
      if (entry.type === "skills") add(entry.text);
      else for (const bullet of entry.bullets) add(bullet);
    }
  }

  for (const chunk of resumeText.split(/[\n•\-–*]/)) add(chunk);
  return candidates;
}

export function findMatchingOriginal(
  resumeText: string,
  structured: StructuredResume,
  original: string
): string | null {
  const trimmed = original.trim();
  if (!trimmed) return null;
  if (resumeText.includes(trimmed)) return trimmed;

  const candidates = collectTextCandidates(resumeText, structured);
  let best: { text: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = textSimilarity(trimmed, candidate);
    if (score >= 0.55 && (!best || score > best.score)) {
      best = { text: candidate, score };
    }
  }

  return best?.text ?? null;
}

export function replaceBulletInStructured(
  resume: StructuredResume,
  original: string,
  suggested: string
): StructuredResume {
  const normOriginal = normalizeResumeText(original);

  const replaceIfMatch = (text: string): string => {
    if (text === original || normalizeResumeText(text) === normOriginal) {
      return suggested;
    }
    return text;
  };

  return {
    ...resume,
    sections: resume.sections.map((section) => ({
      ...section,
      entries: section.entries.map((entry) => {
        if (entry.type === "skills") {
          return { ...entry, text: replaceIfMatch(entry.text) };
        }
        return {
          ...entry,
          bullets: entry.bullets.map((bullet) => replaceIfMatch(bullet)),
        };
      }),
    })),
  };
}
