// Scheme-of-work PDF extraction.
//
// NERDC scheme-of-work PDFs are laid out as tables: a header line like
// "JSS1 ENGLISH STUDIES SCHEME OF WORK" followed by a "FIRST TERM" line and
// then rows of [Week | Topic(s) | Content]. English tables may spread the row
// across five columns; maths tables use Week/Topic/Content. Pages are often
// split mid-scheme, and continuation pages carry NO header (only rows).
//
// We reconstruct the table from pdf.js text items using their (x, y)
// coordinates instead of layout text, so the same parser handles any class /
// subject / term as long as the PDF follows the same tabular convention:
//
//   1. Detect the scheme header by looking for "…SCHEME OF WORK" near a class
//      token (JSS1..SS3) and the subject on the same line.
//   2. Detect "FIRST/SECOND/THIRD TERM" beneath it.
//   3. Cluster item x-positions into column bands; the leftmost band is the
//      "Week" column.
//   4. A row begins at a week-band numeric item (with a companion cell at the
//      same height, or a range marker). Everything between two row tops, in
//      its own column band, becomes a cell.
//   5. Optional labelled columns "Topic" / "Content" are mapped when present;
//      otherwise the row's whole text is kept as content and a short clause
//      becomes the topic heading.
//
// The parser is deliberately tolerant: it never throws on a malformed page —
// it skips segments it cannot classify, so one awkward page can't sink the
// whole import.

import type { Scheme, SchemeWeek } from "@shared/scheme";
import { normalizeGradeToken, normalizeWeekToken } from "@shared/scheme";

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
}

type TextItem = {
  str: string;
  x: number;
  y: number;
};

const SAME_LINE_TOLERANCE = 4;
const CONTENT_LOOKAHEAD = 280;
const RANGE_TAIL_GAP = 30;

/** Weeks written as single cells, a range ("5–10", "7-8", "1 & 2"), or a
 *  range start ("11–") followed by a tail ("13"). */
const WEEK_PATTERN = /^\d{1,2}$/;
const WEEK_RANGE_PATTERN = /^\d{1,2}\s*(?:(?:[-–—−]\s*\d{1,2})|(?:&\s*\d{1,2}))$/;
const WEEK_DASH_START = /^\d{1,2}\s*[-–—−]$/;

const GRADE_PATTERN = /(JSS\s?[123]|SSS?\s?[123])/i;
const TERM_PATTERN = /\b(FIRST|SECOND|THIRD)\s*TERM\b/i;

function isWeekCandidate(text: string): boolean {
  return WEEK_PATTERN.test(text) || WEEK_RANGE_PATTERN.test(text) || WEEK_DASH_START.test(text);
}

function detectSubject(header: string): { id: string; name: string } | null {
  if (/MATHEMATICS/i.test(header)) return { id: "maths", name: "Mathematics" };
  if (/ENGLISH/i.test(header)) return { id: "english", name: "English Studies" };
  return null;
}

function detectTerm(termLine: string): Scheme["term"] | null {
  const match = termLine.match(TERM_PATTERN);
  if (!match) return null;
  const ordinal = match[1].charAt(0) + match[1].slice(1).toLowerCase();
  return `${ordinal} term` as Scheme["term"];
}

function clean(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s([,.;:!?])/g, "$1")
    .trim();
}

/** Builds a short topic heading from a blob of cell text by cutting at the
 *  first clause boundary, falling back to a length cap. */
function deriveTopicTitle(text: string): string {
  const t = clean(text);
  const first = t.split(/[;|:|–—-]\s/)[0] || t;
  return first.length > 90 ? `${first.slice(0, 90).replace(/\s+\S*$/, "")}…` : first;
}

class SectionBuilder {
  grade: string;
  subjectId: string;
  subject: string;
  term: string;
  weeks: SchemeWeek[] = [];

  constructor(grade: string, subjectId: string, subject: string, term: string) {
    this.grade = grade;
    this.subjectId = subjectId;
    this.subject = subject;
    this.term = term;
  }

  /** Push a raw row and dedupe by week key (covers duplicated pages). */
  append(row: { week: string; topic: string; content: string }) {
    const key = row.week;
    const existing = this.weeks.find((w) => w.week === key);
    if (!existing) {
      this.weeks.push(row);
      return;
    }
    if (row.content.length > existing.content.length) {
      existing.topic = row.topic || existing.topic;
      existing.content = row.content;
    }
  }
}

/** Clusters x values into column bands (gap > 40 separates columns). */
function clusterColumns(xSamples: number[]): number[] {
  const sorted = Array.from(new Set(xSamples)).sort((a, b) => a - b);
  const anchors: number[] = [];
  for (const x of sorted) {
    const last = anchors[anchors.length - 1];
    if (last === undefined || x - last > 40) anchors.push(x);
  }
  return anchors;
}

/** Attributes an x to the nearest column anchor to its left (its cell). */
function bandFor(x: number, anchors: number[]): number {
  let idx = -1;
  for (let i = 0; i < anchors.length; i++) {
    if (x >= anchors[i] - 1) idx = i;
  }
  return idx < 0 ? 0 : idx;
}

type PageRow = {
  topY: number;
  weekParts: string[];
  cells: { band: number; parts: string[] }[];
};

function buildPageRows(items: TextItem[], anchors: number[]): PageRow[] {
  const rows: PageRow[] = [];
  let lastRowTopY: number | null = null;
  let previousWeekItem: { text: string; y: number } | null = null;
  let current: PageRow | null = null;

  // Y values at which there is at least one non-week (cell) item. A week
  // number sitting on a line that also carries cell text is definitely a row
  // start; isolated digits (e.g. PDF page numbers) have no companion here.
  const companionY = new Set<number>();
  const contentY: number[] = [];
  for (const item of items) {
    if (bandFor(item.x, anchors) !== 0) {
      companionY.add(Math.round(item.y));
      contentY.push(item.y);
    }
  }
  const hasCompanionNear = (y: number) => {
    const rounded = Math.round(y);
    for (let dy = -SAME_LINE_TOLERANCE; dy <= SAME_LINE_TOLERANCE; dy += 2) {
      if (companionY.has(rounded + dy)) return true;
    }
    return false;
  };
  // Real rows always carry some cell text within this many units below their
  // week line; PDF page numbers (the last item on a page) never do.
  const hasContentBelow = (y: number) =>
    contentY.some((vy) => vy < y - SAME_LINE_TOLERANCE && y - vy <= CONTENT_LOOKAHEAD);

  for (const item of items) {
    const band = bandFor(item.x, anchors);
    // Week anchors are clustered identically, so a band index of 0 = leftmost
    // = the week column in every table this parser supports.
    if (band !== 0) {
      if (current) current.cells.push({ band, parts: [item.str] });
      continue;
    }
    if (!isWeekCandidate(item.str)) {
      if (current) current.cells.push({ band, parts: [item.str] });
      continue;
    }

    // Range tail: a second digit right below a "11–"-style marker.
    if (
      previousWeekItem &&
      WEEK_DASH_START.test(previousWeekItem.text) &&
      Math.abs(previousWeekItem.y - item.y) <= RANGE_TAIL_GAP
    ) {
      if (current) current.weekParts.push(item.str);
      previousWeekItem = { text: previousWeekItem.text + "-" + item.str, y: item.y };
      continue;
    }

    // Row start unless it is an isolated digit far from the sequence (PDF
    // page numbers): those have no cell companion on their line and no cell
    // text below them anywhere.
    const rowStart =
      lastRowTopY === null ||
      hasCompanionNear(item.y) ||
      hasContentBelow(item.y);

    if (rowStart) {
      current = { topY: item.y, weekParts: [item.str], cells: [] };
      previousWeekItem = { text: item.str, y: item.y };
      lastRowTopY = item.y;
      rows.push(current);
    }
  }

  // Collapse cells: a cell = (band) -> ordered text parts.
  for (const row of rows) {
    const byBand = new Map<number, string[]>();
    for (const cell of row.cells) {
      const list = byBand.get(cell.band) ?? [];
      list.push(cell.parts[0]);
      byBand.set(cell.band, list);
    }
    row.cells = Array.from(byBand.entries()).map(([band, parts]) => ({ band, parts }));
  }
  return rows;
}

type Role = { topic?: number; content?: number };

/** Returns week rows with topic/content resolved using labelled columns when
 *  present (maths/SS English), otherwise the merged text split heuristic. */
function composeWeeks(rows: PageRow[], role: Role): SchemeWeek[] {
  const weeks: SchemeWeek[] = [];
  for (const row of rows) {
    const week = normalizeWeekToken(row.weekParts.join(" "));
    let topic = "";
    let content = "";

    if (role.topic !== undefined) {
      const topicCell = row.cells.find((c) => c.band === role.topic);
      topic = topicCell ? clean(topicCell.parts.join(" ")) : "";
      if (role.content !== undefined) {
        const contentCell = row.cells.find((c) => c.band === role.content);
        content = contentCell ? clean(contentCell.parts.join(" ")) : "";
      } else {
        const rest = row.cells
          .filter((c) => c.band !== role.topic && c.band !== 0)
          .map((c) => clean(c.parts.join(" ")));
        content = rest.join(" | ");
      }
    } else {
      // English JSS multi-column layout: keep the whole row as content.
      const columns = row.cells
        .filter((c) => c.band !== 0)
        .sort((a, b) => a.band - b.band)
        .map((c) => clean(c.parts.join(" ")));
      const merged = columns.filter(Boolean).join(" | ");
      content = merged;
      topic = deriveTopicTitle(merged);
    }

    if (content === "—" || content === "-" || content === "–") content = "";
    if (!topic && !content) topic = week;
    weeks.push({ week, topic, content });
  }
  return weeks;
}

/** Detects labelled column roles by scanning header-ish items ("Topic", "Content"). */
function detectRoles(headerTexts: string[], anchors: number[], items: TextItem[]): Role {
  const role: Role = {};
  for (const item of items) {
    const text = clean(item.str);
    const band = bandFor(item.x, anchors);
    if (band === 0) continue;
    if (/^\s*topic\s*$/i.test(text)) role.topic = band;
    else if (/^\s*content\s*(breakdown)?\s*$/i.test(text)) role.content = band;
  }
  void headerTexts;
  return role;
}

export async function extractSchemes(src: ArrayBufferLike): Promise<{
  schemes: Scheme[];
  pages: number;
}> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(src), useSystemFonts: true });
  const doc = await loadingTask.promise;

  const sections: SectionBuilder[] = [];
  const sectionMap = new Map<string, SectionBuilder>();
  let current: SectionBuilder | null = null;

  const report = {
    schemes: [] as Scheme[],
    pages: -1,
  };
  report.pages = doc.numPages;

  const finalizeCurrent = () => {
    if (!current) return;
    const key = `${current.grade}|${current.subjectId}|${current.term}`;
    const existing = sectionMap.get(key);
    if (existing) {
      for (const week of current.weeks) existing.append(week);
    } else {
      sectionMap.set(key, current);
      // Keep user-facing order = first-seen order across whole document.
      sectionMap.delete(key);
      sectionMap.set(key, current);
      sections.push(current);
    }
    current = null;
  };

  for (let pageIndex = 0; pageIndex < doc.numPages; pageIndex++) {
    const page = await doc.getPage(pageIndex + 1);
    const content = await page.getTextContent();

    const rawItems: TextItem[] = [];
    for (const item of content.items) {
      if ("str" in item && typeof item.str === "string" && item.str.trim()) {
        rawItems.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
        });
      }
    }

    // 1. Scheme header.
    const headerItem = rawItems.find((item) => {
      if (!/SCHEME OF WORK/i.test(item.str)) return false;
      return GRADE_PATTERN.test(item.str) && Boolean(detectSubject(item.str));
    });

    if (headerItem) {
      const gradeMatch = headerItem.str.match(GRADE_PATTERN);
      const subject = detectSubject(headerItem.str);
      if (gradeMatch && subject) {
        finalizeCurrent();
        const headerY = headerItem.y;
        const below = rawItems
          .filter((item) => item.y <= headerY - 1)
          .sort((a, b) => b.y - a.y);
        const term = detectTerm(below.slice(0, 6).map((i) => i.str).join(" ")) ?? "First term";
        current = new SectionBuilder(
          normalizeGradeToken(gradeMatch[1]),
          subject.id,
          subject.name,
          term
        );
      }
    }

    // 2. Decide which items belong to the table and build columns.
    const headerY = headerItem?.y;
    const tableItems = headerY === undefined
      ? rawItems
      : rawItems.filter((item) => item.y <= headerY - 10);
    if (tableItems.length === 0) continue;

    const anchors = clusterColumns(tableItems.map((i) => i.x));

    // Detect labelled roles from the column-header items (presence of Week
    // header is a strong sign the table is header-labelled).
    const roles = headerItem
      ? detectRoles([headerItem.str], anchors, tableItems.slice(0, 60))
      : {};

    const sorted = tableItems
      .slice()
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const pageRows = buildPageRows(sorted, anchors);

    if (pageRows.length === 0) continue;

    const weeks = composeWeeks(pageRows, roles);

    if (!current) {
      // Continuation page with no open scheme (e.g. a mid-term break or an
      // incomplete PDF). Only keep it if it continues the previous sequence:
      // we can't know its class/subject otherwise.
      const previous = sections[sections.length - 1];
      if (!previous || previous.weeks.length === 0) continue;
      const prevLast = parseLeadingWeek(previous.weeks[previous.weeks.length - 1]?.week);
      const first = parseLeadingWeek(weeks[0]?.week);
      if (first !== null && prevLast !== null && first >= prevLast && first - prevLast <= 2) {
        for (const week of weeks) previous.append(week);
      }
      continue;
    }

    for (const week of weeks) current.append(week);
  }

  finalizeCurrent();

  const now = new Date().toISOString();
  report.schemes = sections.map((section, index) => ({
    id: `${section.grade}-${section.subjectId}-${section.term.toLowerCase().replace(/\s+/g, "-")}-${index}`,
    grade: section.grade,
    subjectId: section.subjectId,
    subject: section.subject,
    term: section.term,
    weeks: section.weeks,
    sourceFile: null,
    currentWeek: null,
    importedAt: now,
    updatedAt: now,
  }));

  await loadingTask.destroy();
  return report;
}

function parseLeadingWeek(week: string | undefined): number | null {
  if (!week) return null;
  const match = week.match(/^(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

/** Extracts schemes from raw PDF bytes (base64 from the admin upload form). */
export async function parseSchemePdf(
  dataBase64: string,
  fileName: string
): Promise<Scheme[]> {
  const binary = Buffer.from(dataBase64, "base64");
  const { schemes } = await extractSchemes(binary.buffer.slice(
    binary.byteOffset,
    binary.byteOffset + binary.byteLength
  ) as ArrayBuffer);
  return schemes.map((scheme) => ({
    ...scheme,
    id: scheme.id,
    sourceFile: fileName,
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}