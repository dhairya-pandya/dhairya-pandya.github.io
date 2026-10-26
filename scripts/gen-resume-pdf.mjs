/**
 * Generates public/resume.pdf from the same data the site renders.
 *
 * STACK CHOICE, stated rather than made silently:
 *
 * The realistic options were (a) headless Chromium printing the
 * /resume route, (b) a PDF library such as pdfkit or pdf-lib, or
 * (c) writing the PDF by hand against the base-14 fonts.
 *
 * Picked (c). A resume is text on a grid, which is the one document
 * shape a hand-rolled writer handles well, and it keeps the build
 * dependency-free and deterministic. (a) would mean shipping a
 * ~300MB browser to CI to render one page, and (b) means a runtime
 * dependency for roughly 200 lines of output.
 *
 * What this rules out: no embedded fonts, so the PDF is set in
 * Helvetica and Courier rather than Geist, and text is limited to
 * WinAnsi. Non-ASCII is transliterated below. If the resume ever
 * needs real typography or a second column, switch to (a) and
 * accept the dependency.
 *
 * Reads src/config/site.ts and src/data/work.ts by parsing them as
 * modules is not possible from plain node without a TS loader, so
 * the content is mirrored here explicitly and a test in the build
 * step compares the two. Kept in one place: RESUME below.
 *
 * Run: node scripts/gen-resume-pdf.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(ROOT, "public"), { recursive: true });

/* ---- font metrics (base-14, units per 1000) --------------------
   Widths are needed for line breaking. These are the standard AFM
   values; Courier is monospaced at 600. */
const HELV = "278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584"
  .split(" ")
  .map(Number);
const HELVB = "278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584"
  .split(" ")
  .map(Number);

const FONTS = {
  regular: { res: "F1", widths: HELV },
  bold: { res: "F2", widths: HELVB },
  mono: { res: "F3", widths: null }, // Courier, fixed 600
};

/** Transliterate to WinAnsi-safe ASCII. See the header note. */
function ascii(s) {
  return String(s)
    .replace(/∞/g, "now") // infinity, used for ongoing ranges
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/á/g, "a")
    .replace(/à/g, "a")
    .replace(/Đ|đ/g, "D")
    .replace(/í/g, "i")
    .replace(/[^\x20-\x7e]/g, "");
}

function widthOf(text, font, size) {
  const f = FONTS[font];
  if (!f.widths) return text.length * 600 * (size / 1000);
  let w = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c <= 126 ? f.widths[c - 32] : 556;
  }
  return (w * size) / 1000;
}

function wrap(text, font, size, maxW) {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (widthOf(test, font, size) > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ---- page geometry, in PDF points (72 per inch) ---------------- */
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const M = 52; // margin
const COL = PAGE_W - M * 2;
const BOTTOM = 64; // reserve for the footer

/* ---- content model -------------------------------------------
   Mirrors src/config/site.ts and src/data/work.ts. The check at
   the bottom of this file fails the build if the name, email or
   project count drift apart, which is the drift that would
   actually matter. */
const RESUME = {
  name: "Dhairya Pandya",
  role: "AI/ML Engineer",
  contact: [
    "dhairyapandya.workspace@gmail.com",
    "+91 91739 31925",
    "India",
    "dhairyapandya.holdout.workers.dev",
  ],
  summary:
    "AI/ML engineer focused end to end on machine learning: data pipelines, model training, evaluation, and deployment. Every result I report comes with the baseline it beat and the conditions under which it fails.",
  availability: "Open to AI/ML internships and research roles for Summer 2027.",
  sections: [
    {
      title: "Experience",
      entries: [
        {
          head: "ML Engineer, Shipd",
          meta: "Freelance / Remote / 03.2026 - now",
          bullets: [
            "Building ML evaluation benchmarks and data solutions for AI labs to reinforce and improve the engineering capabilities of frontier models.",
            "Finished in top-three positions for more than 20 challenges spanning NLP, time-series, fine-tuning, computer vision, sequence-to-sequence, from-scratch modelling, and recommendation systems.",
          ],
        },
        {
          head: "Competitions Expert (in progress), Kaggle",
          meta: "Part-time / 01.2025 - now",
          bullets: [
            "Finished 539th on Santa 2025, Christmas Tree Packing Challenge, a geometric optimization problem scored on normalized bounding-box area.",
            "Currently competing in BioHub Cell Tracking, still open.",
          ],
        },
      ],
    },
    {
      title: "Selected systems",
      entries: [
        {
          head: "PathOS",
          meta: "Shipped / 05.2026 - now",
          bullets: [
            "Offline AI pathologist for H&E histopathology screening, running the first-pass slide read on a laptop with no GPU and no internet.",
            "88% yes/no accuracy on a 100-sample PathVQA validation set, against ~50% from the base Gemma 4 E2B with no pathology tuning.",
            "Won the Ollama Prize, Special Technology Track, Gemma 4 Good Hackathon (Kaggle x Google DeepMind), against 1,600+ teams.",
            "Gemma 4 / Unsloth / GRPO / LoRA / GGUF / Ollama",
          ],
        },
        {
          head: "Papersseum",
          meta: "Shipped / 10.2026",
          bullets: [
            "Real-time multi-agent territory game: five agents draw trails on a shared arena, and closing a loop takes everything inside it. Deterministic replays, Gym-style environment, replay viewer.",
            "Python / Multi-agent / Reinforcement learning",
          ],
        },
        {
          head: "Udte Bhawre",
          meta: "Shipped / 04.2026 - 05.2026",
          bullets: [
            "Cross-platform desktop AI companion living in the taskbar, with concurrent Gemini, Claude and Codex sessions behind one MCP tool layer.",
            "2nd prize, team getalife(), Hackbyte 4.0, IIITDM Jabalpur.",
            "Electron / Node.js / MongoDB / Gemini / MCP",
          ],
        },
        {
          head: "RocketLandingWithRL",
          meta: "Shipped / 09.2026 - 10.2026",
          bullets: [
            "2D rocket landing on a moving drone ship in gusty wind: environment, physics and seven RL algorithms written from scratch, trained on a laptop CPU.",
            "Randomized training produced a generalist that beats each level's specialist; the best mix-trained PPO lands 76% of far booster returns against a hand-written PID's 45%.",
            "Python / PyTorch / PPO / SAC / GRPO",
          ],
        },
        {
          head: "NyayaSetu",
          meta: "Shipped / 01.2026 - 03.2026",
          bullets: [
            "Multi-agent legal intelligence system bridging static IPC/BNS statutes with live Supreme Court judgments, to cut hallucination in legal AI.",
            "4 specialized LangGraph agents (retrieval, live-judgment verification, multimodal evidence review, synthesis), built for Convolve 4.0, a Pan-IIT hackathon.",
            "LangGraph / LangChain / Streamlit / Qdrant / Gemini 2.5 Flash",
          ],
        },
      ],
    },
    {
      title: "Skills and tools",
      entries: [
        { head: "Languages", meta: "", bullets: ["Python, Java, C++, C, SQL"] },
        { head: "ML and data", meta: "", bullets: ["scikit-learn, NumPy, Pandas, Matplotlib, exploratory data analysis"] },
        { head: "Serving and infra", meta: "", bullets: ["PostgreSQL, Hugging Face, Docker, Bash, Git"] },
        { head: "Applied AI", meta: "", bullets: ["Prompt engineering, retrieval, eval harnesses, quantization"] },
        { head: "Modeling", meta: "", bullets: ["Fine-tuning, time-series, computer vision, recommendation systems, sequence-to-sequence"] },
        { head: "Foundations", meta: "", bullets: ["Linear algebra, probability, statistics, optimization"] },
      ],
    },
    {
      title: "Volunteer",
      entries: [
        {
          head: "Volunteer organiser, HackByte 4.0, IIITDM Jabalpur",
          meta: "2026",
          bullets: ["Helped organise a hackathon with over 6,000 registrations. Handled public relations and on-ground crowd and resource management."],
        },
      ],
    },
  ],
};

/* ---- layout engine -------------------------------------------- */
const pages = [];
let ops = [];
let y = 0;

function newPage() {
  if (ops.length) pages.push(ops);
  ops = [];
  y = PAGE_H - M;
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function text(str, { font = "regular", size = 9.5, x = M, gray = 0 } = {}) {
  ops.push(
    `BT /${FONTS[font].res} ${size} Tf ${gray} g 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${esc(ascii(str))}) Tj ET`
  );
}

/** Right-aligned, for the meta column. */
function textRight(str, { font = "mono", size = 8.5, gray = 0.45 } = {}) {
  const w = widthOf(ascii(str), font, size);
  ops.push(
    `BT /${FONTS[font].res} ${size} Tf ${gray} g 1 0 0 1 ${(PAGE_W - M - w).toFixed(2)} ${y.toFixed(2)} Tm (${esc(ascii(str))}) Tj ET`
  );
}

function rule(gray = 0.8) {
  ops.push(
    `${gray} G 0.5 w ${M} ${y.toFixed(2)} m ${(PAGE_W - M).toFixed(2)} ${y.toFixed(2)} l S`
  );
}

function need(h) {
  if (y - h < BOTTOM) newPage();
}

function paragraph(str, { font = "regular", size = 9.5, lead = 12.5, x = M, w = COL, gray = 0.15 } = {}) {
  for (const line of wrap(str, font, size, w)) {
    need(lead);
    text(line, { font, size, x, gray });
    y -= lead;
  }
}

function bullet(str) {
  const indent = 10;
  const lines = wrap(str, "regular", 9.5, COL - indent);
  lines.forEach((line, i) => {
    need(12.5);
    if (i === 0) {
      ops.push(`0.55 g ${(M + 2).toFixed(2)} ${(y + 3).toFixed(2)} 1.6 1.6 re f`);
    }
    text(line, { size: 9.5, x: M + indent, gray: 0.2 });
    y -= 12.5;
  });
}

/* ---- compose --------------------------------------------------- */
newPage();

text(RESUME.name, { font: "bold", size: 20 });
y -= 15;
text(`${RESUME.role}  /  Dual degree in progress`, {
  font: "mono",
  size: 8.5,
  gray: 0.4,
});
y -= 13;
text(RESUME.contact.join("   /   "), { font: "mono", size: 8.5, gray: 0.25 });
y -= 16;
rule(0.75);
y -= 14;

paragraph(RESUME.summary, { size: 9.5, lead: 13 });
y -= 3;
text(RESUME.availability, { font: "bold", size: 9, gray: 0.1 });
y -= 20;

for (const section of RESUME.sections) {
  need(46);
  text(section.title.toUpperCase(), { font: "bold", size: 9, gray: 0 });
  y -= 5;
  rule(0.8);
  y -= 14;

  for (const entry of section.entries) {
    need(30);
    /* Head and meta on one baseline: head left, meta right. */
    text(entry.head, { font: "bold", size: 10 });
    if (entry.meta) textRight(entry.meta);
    y -= 13;
    for (const b of entry.bullets) bullet(b);
    y -= 7;
  }
  y -= 5;
}

/* Footer on every page, added after composition so the page count
   is known. */
pages.push(ops);
const total = pages.length;
pages.forEach((pageOps, i) => {
  const label = `${RESUME.name}  /  page ${i + 1} of ${total}  /  dhairyapandya.holdout.workers.dev`;
  const w = widthOf(label, "mono", 7.5);
  pageOps.push(
    `BT /F3 7.5 Tf 0.55 g 1 0 0 1 ${((PAGE_W - w) / 2).toFixed(2)} ${(M - 18).toFixed(2)} Tm (${esc(label)}) Tj ET`
  );
});

/* ---- serialise ------------------------------------------------- */
const objects = [];
const push = (body) => {
  objects.push(body);
  return objects.length; // 1-indexed object number
};

/* Object numbers are allocated up front so /Kids can reference the
   page objects before their content streams exist. */
const catalogNo = 1;
const pagesNo = 2;
const fontNos = { F1: 3, F2: 4, F3: 5 };
const firstPageNo = 6;
const pageNos = pages.map((_, i) => firstPageNo + i * 2);
const contentNos = pages.map((_, i) => firstPageNo + i * 2 + 1);

push(`<< /Type /Catalog /Pages ${pagesNo} 0 R >>`);
push(
  `<< /Type /Pages /Count ${total} /Kids [${pageNos.map((n) => `${n} 0 R`).join(" ")}] >>`
);
push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
push(`<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>`);

pages.forEach((pageOps, i) => {
  push(
    `<< /Type /Page /Parent ${pagesNo} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
      `/Resources << /Font << /F1 ${fontNos.F1} 0 R /F2 ${fontNos.F2} 0 R /F3 ${fontNos.F3} 0 R >> >> ` +
      `/Contents ${contentNos[i]} 0 R >>`
  );
  const stream = pageOps.join("\n");
  push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
});

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefAt = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
offsets.forEach((o) => {
  pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
});
pdf +=
  `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNo} 0 R ` +
  `/Info << /Title (${RESUME.name} - Resume) /Author (${RESUME.name}) /Producer (scripts/gen-resume-pdf.mjs) >> >>\n` +
  `startxref\n${xrefAt}\n%%EOF\n`;

const out = join(ROOT, "public", "resume.pdf");
writeFileSync(out, Buffer.from(pdf, "latin1"));

/* ---- drift check ----------------------------------------------
   The one thing worth failing the build over: this file mirrors
   content that lives in TypeScript, and a mirror that silently
   disagrees with its source is worse than no mirror. */
const site = readFileSync(join(ROOT, "src", "config", "site.ts"), "utf8");
const work = readFileSync(join(ROOT, "src", "data", "work.ts"), "utf8");
const problems = [];
if (!site.includes(RESUME.name)) problems.push("name does not match site.ts");
if (!site.includes(RESUME.contact[0])) problems.push("email does not match site.ts");
const projectCount = (work.match(/^\s{4}slug: "/gm) || []).length;
if (projectCount !== 5) problems.push(`work.ts has ${projectCount} projects, expected 5`);

if (problems.length) {
  console.error("resume PDF drift check FAILED:");
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}

console.log(
  `wrote public/resume.pdf, ${total} page(s), ${(Buffer.byteLength(pdf, "latin1") / 1024).toFixed(1)} KB`
);
console.log("drift check passed: name, email and project count agree with src/");
