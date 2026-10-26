/**
 * Generates the site's mock imagery into public/mock as SVG.
 *
 * Why generate rather than drop in stock photography:
 *
 *  1. The subject is machine learning, so the honest "hero image"
 *     for a project is the artifact it produced. A spectrogram, a
 *     confusion matrix and a retrieval graph carry information;
 *     an abstract gradient carries none.
 *  2. Nothing 404s and nothing is hotlinked. Every asset is local,
 *     versioned, and inspectable in a text editor.
 *  3. Seeded, so a rebuild produces byte-identical output. An
 *     unseeded Math.random() would churn the whole directory on
 *     every run and make the diffs useless.
 *
 * Run: node scripts/gen-mock.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "mock");
mkdirSync(OUT, { recursive: true });

/* ---- seeded PRNG (mulberry32) -----------------------------------
   Deterministic output is the whole point; see note 3 above. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- palette ----------------------------------------------------
   The UI chrome is monochrome by design, so all the chroma on the
   site lives in these posters. Each one gets exactly one hue and
   spends it on the data, never on the background. Kept at low
   saturation so a poster reads as an instrument readout rather
   than as decoration. */
const INK = "#f2f2f2";
const DIM = "#8f8f8f";
const GROUND = "#0d0d0e";
const PANEL = "#141416";
const LINE = "rgba(255,255,255,0.10)";
const FAINT = "rgba(255,255,255,0.055)";

const LP_DARK = {
  a: "#141416", b: "#0d0d0e", ink: "#f2f2f2", dim: "#8f8f8f",
  line: "rgba(255,255,255,0.14)", faint: "rgba(255,255,255,0.06)",
};
const LP_LIGHT = {
  a: "#ffffff", b: "#f3f3f1", ink: "#131313", dim: "#6b6b68",
  line: "rgba(0,0,0,0.14)", faint: "rgba(0,0,0,0.06)",
};

const HUES = {
  amber: ["#f59e0b", "#7c4a06"],
  lime: ["#a3e635", "#3f5312"],
  cyan: ["#22d3ee", "#0b4a56"],
  violet: ["#a78bfa", "#3f2d78"],
  rose: ["#fb7185", "#6b1d2b"],
  orange: ["#fb923c", "#6d3311"],
  teal: ["#2dd4bf", "#0d4f47"],
};

const W = 1200;
const H = 750;

/** Shared defs: a grain overlay and the plate gradient. Grain is
 *  what keeps a flat SVG from looking like clip art at large sizes. */
function defs(extra = "") {
  return `<defs>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PANEL}"/>
      <stop offset="1" stop-color="${GROUND}"/>
    </linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.055"/></feComponentTransfer>
    </filter>
    ${extra}
  </defs>`;
}

/** The plate every poster sits on: gradient ground, hairline frame,
 *  a faint 40px measure grid, and a grain wash on top. */
function plate(children, { grid = true } = {}) {
  let g = "";
  if (grid) {
    const lines = [];
    for (let x = 40; x < W; x += 40) lines.push(`M${x} 0V${H}`);
    for (let y = 40; y < H; y += 40) lines.push(`M0 ${y}H${W}`);
    g = `<path d="${lines.join("")}" stroke="${FAINT}" stroke-width="1" fill="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  ${defs()}
  <rect width="${W}" height="${H}" fill="url(#plate)"/>
  ${g}
  ${children}
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.9"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${LINE}"/>
</svg>`;
}

/** Mono caption block, bottom-left, matching the site's label style. */
function caption(kicker, title, sub) {
  return `<g font-family="Geist Mono, ui-monospace, monospace">
    <text x="48" y="${H - 92}" font-size="19" letter-spacing="1.6" fill="${DIM}">${kicker}</text>
    <text x="48" y="${H - 58}" font-size="30" letter-spacing="-0.2" fill="${INK}">${title}</text>
    <text x="48" y="${H - 30}" font-size="17" letter-spacing="0.5" fill="${DIM}">${sub}</text>
  </g>`;
}

/** Axis frame for the plotted posters. */
function axes(x, y, w, h, xlabel, ylabel) {
  return `<g>
    <path d="M${x} ${y}V${y + h}H${x + w}" stroke="${LINE}" stroke-width="1.5" fill="none"/>
    <g font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1.2" fill="${DIM}">
      <text x="${x + w}" y="${y + h + 26}" text-anchor="end">${xlabel}</text>
      <text x="${x - 10}" y="${y - 10}" text-anchor="start">${ylabel}</text>
    </g>
  </g>`;
}

const files = {};

/* =================================================================
   1. Eval accuracy climb. PathOS: three training iterations against
   the base model's yes/no accuracy on histopathology VQA. Each
   iteration is annotated with what actually moved it, because the
   number alone hides that the win was GRPO killing the hedging, not
   a bigger model.
   ================================================================= */
{
  const [hot] = HUES.rose;
  const steps = [
    { n: "BASE\nGEMMA 4", v: 0.50, note: "no pathology tuning" },
    { n: "PATHOS\nv1", v: 0.32, note: "82% of misses were hedges" },
    { n: "PATHOS\nv2", v: 0.44, note: "answer tags + GRPO" },
    { n: "PATHOS\nv3", v: 0.88, note: "distilled inference tricks" },
  ];
  const x0 = 130, y0 = 96, h = 380, bw = 130, gap = 250;
  let bars = "";
  steps.forEach((s, i) => {
    const cx = x0 + i * gap;
    const barH = s.v * h;
    const isLast = i === steps.length - 1;
    bars += `<rect x="${cx}" y="${(y0 + h - barH).toFixed(1)}" width="${bw}" height="${barH.toFixed(1)}" fill="${isLast ? hot : INK}" opacity="${isLast ? 0.92 : 0.35 + i * 0.08}"/>`;
    bars += `<g font-family="Geist Mono, ui-monospace, monospace" font-size="15" fill="${DIM}">
      <text x="${cx + bw / 2}" y="${(y0 + h - barH - 16).toFixed(1)}" text-anchor="middle" font-size="22" fill="${isLast ? hot : INK}">${Math.round(s.v * 100)}%</text>
      ${s.n.split("\n").map((l, li) => `<text x="${cx + bw / 2}" y="${y0 + h + 28 + li * 20}" text-anchor="middle" letter-spacing="1" fill="${INK}">${l}</text>`).join("")}
      <text x="${cx + bw / 2}" y="${y0 + h + 28 + s.n.split("\n").length * 20 + 4}" text-anchor="middle" font-size="13" fill="${DIM}">${s.note}</text>
    </g>`;
  });
  files["poster-pathos.svg"] = plate(
    `${bars}${axes(x0 - 30, y0, W - 160, h, "", "YES/NO ACCURACY")}${caption("FIG.01  EVAL ACCURACY", "Single forward pass, no proxy", "100-sample PathVQA validation set")}`,
    { grid: false }
  );
}

/* =================================================================
   2. Request path. Udte-Bhawre: one strict vertical chain, no side
   branches. The tray dispatches to a session, every session's tool
   calls cross the ArmorIQ gate, MCP servers are the only thing on
   the other side of it, and MCP is what touches both the local
   machine and MongoDB. Every stage is full-width and centred so
   nothing has to jog sideways to reach the next one.
   ================================================================= */
{
  const [hot] = HUES.cyan;
  const [guard] = HUES.teal;
  const [db] = HUES.violet;
  const cx = W / 2;
  const stageW = 340;
  const stageX = cx - stageW / 2;

  const rowGap = 126; // centre-to-centre distance between stages
  let y = 50;

  const tray = { y, h: 54 };
  y += rowGap;
  const sessRow = { y, h: 44 };
  y += rowGap;
  const gateRow = { y, h: 50 };
  y += rowGap;
  const mcpRow = { y, h: 50 };
  y += rowGap;
  const leafRow = { y, h: 56 };

  let out = "";

  // Straight connecting spine, drawn first so every node sits on
  // top of it and no stage has to route around another.
  out += `<path d="M${cx} ${tray.y + tray.h}V${leafRow.y}" stroke="${DIM}" stroke-width="1.5" opacity="0.35"/>`;

  // 1. Tray / Control Centre, with MongoDB attached directly beside
  // it as a short, single-hop connection: it is the one relationship
  // in this diagram that is not part of the request path downward,
  // so it gets a different shape (sideways, one edge) rather than
  // being folded into the vertical chain where it does not belong.
  out += `<g>
    <rect x="${stageX}" y="${tray.y}" width="${stageW}" height="${tray.h}" rx="10" fill="${hot}" opacity="0.16" stroke="${hot}" stroke-width="1.5"/>
    <text x="${cx}" y="${tray.y + 24}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="16" letter-spacing="1" fill="${INK}">TRAY / CONTROL CENTRE</text>
    <text x="${cx}" y="${tray.y + 44}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="12" fill="${DIM}">Electron main + renderer</text>
  </g>`;

  const dbW = 200, dbGap = 46, dbX = stageX - dbGap - dbW, dbMidY = tray.y + tray.h / 2;
  out += `<path d="M${dbX + dbW + 6} ${dbMidY}H${stageX - 6}" stroke="${db}" stroke-width="1.8" opacity="0.6"/>
    <path d="M${dbX + dbW + 20} ${dbMidY - 6}l-12 6 12 6" fill="none" stroke="${db}" stroke-width="1.8"/>`;
  out += `<g>
    <rect x="${dbX}" y="${tray.y}" width="${dbW}" height="${tray.h}" rx="10" fill="${db}" opacity="0.14" stroke="${db}" stroke-width="1.5"/>
    <text x="${dbX + dbW / 2}" y="${tray.y + 24}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1" fill="${INK}">MONGODB</text>
    <text x="${dbX + dbW / 2}" y="${tray.y + 44}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="11" fill="${DIM}">agents + conversations</text>
  </g>`;

  // 2. Sessions, one row, fed straight down from the tray.
  const sessions = ["GEMINI", "CLAUDE", "CODEX", "CUSTOM"];
  const sessW = 176, sessGap = 36;
  const rowW = sessions.length * sessW + (sessions.length - 1) * sessGap;
  const sessX0 = cx - rowW / 2;

  // 3. The ArmorIQ gate: shorter than the session row on purpose, so
  // it reads as a distinct checkpoint rather than a slab stretching
  // the full width. Every session's edge still visibly funnels into
  // it, just converging rather than dropping straight down.
  const gateW = 460, gateX = cx - gateW / 2;

  sessions.forEach((n, i) => {
    const x = sessX0 + i * (sessW + sessGap);
    const scx = x + sessW / 2;
    const entryX = gateX + 30 + (i * (gateW - 60)) / (sessions.length - 1);
    out += `<path d="M${cx} ${tray.y + tray.h} C ${cx} ${(tray.y + tray.h + sessRow.y) / 2}, ${scx} ${(tray.y + tray.h + sessRow.y) / 2}, ${scx} ${sessRow.y}" fill="none" stroke="${hot}" stroke-width="1.8" opacity="0.55"/>`;
    out += `<rect x="${x}" y="${sessRow.y}" width="${sessW}" height="${sessRow.h}" rx="8" fill="none" stroke="${hot}" stroke-width="1.5"/>
      <text x="${scx}" y="${sessRow.y + sessRow.h / 2 + 5}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1" fill="${INK}">${n}</text>`;
    out += `<path d="M${scx} ${sessRow.y + sessRow.h} C ${scx} ${(sessRow.y + sessRow.h + gateRow.y) / 2}, ${entryX} ${(sessRow.y + sessRow.h + gateRow.y) / 2}, ${entryX} ${gateRow.y}" fill="none" stroke="${guard}" stroke-width="1.8" opacity="0.6"/>`;
  });

  let hatch = "";
  for (let hx = gateX + 14; hx < gateX + gateW - 10; hx += 16) {
    hatch += `<path d="M${hx} ${gateRow.y + gateRow.h - 8}l10 -${gateRow.h - 16}" stroke="${guard}" stroke-width="1" opacity="0.22"/>`;
  }
  out += `<g>
    <rect x="${gateX}" y="${gateRow.y}" width="${gateW}" height="${gateRow.h}" rx="10" fill="${guard}" opacity="0.14" stroke="${guard}" stroke-width="1.5"/>
    ${hatch}
    <text x="${cx}" y="${gateRow.y + gateRow.h / 2 - 2}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="16" letter-spacing="1.2" fill="${INK}">ARMORIQ SDK</text>
    <text x="${cx}" y="${gateRow.y + gateRow.h / 2 + 18}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="12" letter-spacing="0.6" fill="${DIM}">cryptographic intent verification, every call</text>
  </g>`;

  // 4. MCP servers.
  out += `<path d="M${cx} ${gateRow.y + gateRow.h}V${mcpRow.y}" stroke="${guard}" stroke-width="2" opacity="0.75"/>
    <path d="M${cx - 6} ${mcpRow.y - 12}l6 12 6 -12" fill="none" stroke="${guard}" stroke-width="2"/>`;
  out += `<g>
    <rect x="${cx - 260 / 2}" y="${mcpRow.y}" width="260" height="${mcpRow.h}" rx="8" fill="none" stroke="${DIM}" stroke-width="1.5"/>
    <text x="${cx}" y="${mcpRow.y + mcpRow.h / 2 + 5}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="16" letter-spacing="1" fill="${INK}">MCP SERVERS</text>
  </g>`;

  // 5. The one thing MCP is allowed to touch on the local machine.
  const leafW = 260, leafX = cx - leafW / 2, lcx = cx;
  out += `<path d="M${cx} ${mcpRow.y + mcpRow.h}V${leafRow.y}" stroke="${DIM}" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  out += `<g>
    <rect x="${leafX}" y="${leafRow.y}" width="${leafW}" height="${leafRow.h}" rx="8" fill="${DIM}" opacity="0.08" stroke="${DIM}" stroke-width="1.5"/>
    <text x="${lcx}" y="${leafRow.y + 24}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1" fill="${INK}">LOCAL SYSTEM</text>
    <text x="${lcx}" y="${leafRow.y + 44}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="11" fill="${DIM}">files, terminal, screen capture</text>
  </g>`;

  files["poster-udtebhawre.svg"] = plate(
    `${out}${caption("FIG.02  REQUEST PATH", "MongoDB off to one side", "tray to session to ArmorIQ to MCP to local system, one column")}`
  );
}

/* =================================================================
   3. RocketLandingWithRL: success rate per level, from the README's
   results table (100 held-out starts per cell, one seed). Three rows:
   the hand-written PID, the best mix-trained PPO, and the L3 specialist,
   so the picture shows both the generalist win and the L4 gap.
   ================================================================= */
{
  const [hot] = HUES.cyan;
  const levels = ["L0", "L1", "L2", "L3", "L4"];
  const rows = [
    { n: "PID (HAND-WRITTEN)", v: [1.0, 1.0, 0.98, 0.45, 0.45], c: INK, o: 0.3 },
    { n: "PPO, L3 ONLY", v: [1.0, 0.99, 0.99, 0.95, 0.1], c: INK, o: 0.5 },
    { n: "PPO, MIX + ENTROPY", v: [1.0, 0.95, 0.91, 0.62, 0.76], c: hot, o: 0.92 },
  ];
  const x0 = 110, y0 = 150, h = 270, groupW = 180, barW = 40;
  let bars = "";
  levels.forEach((lv, li) => {
    const gx = x0 + li * groupW;
    rows.forEach((r, ri) => {
      const v = r.v[li];
      const bh = v * h;
      const bx = gx + ri * (barW + 6);
      const by = y0 + h - bh;
      bars += `<rect x="${bx}" y="${by.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" fill="${r.c}" opacity="${r.o}"/>`;
    });
    bars += `<text x="${gx + (barW * 3 + 12) / 2}" y="${y0 + h + 30}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="18" fill="${INK}">${lv}</text>`;
  });
  let legend = "";
  rows.forEach((r, i) => {
    legend += `<rect x="${x0 + i * 300}" y="${y0 - 66}" width="14" height="14" fill="${r.c}" opacity="${r.o}"/>
      <text x="${x0 + i * 300 + 24}" y="${y0 - 54}" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1" fill="${DIM}">${r.n}</text>`;
  });
  const hl = `<text x="${x0 + 4 * groupW + (barW * 2 + 6) + 14}" y="${y0 + h - 0.76 * h - 14}" font-family="Geist Mono, ui-monospace, monospace" font-size="22" fill="${hot}">76%</text>`;
  files["poster-rocketlanding.svg"] = plate(
    `${axes(x0 - 30, y0, levels.length * groupW, h, "", "SUCCESS RATE")}${legend}${bars}${hl}${caption("FIG.04  BOOSTER LANDING", "Generalists beat specialists", "100 held-out starts per cell, one seed, L4 is the far booster return")}`
  );
}

/* =================================================================
   3b. Papersseum: a circular arena with five territories, each one a
   tinted region with its own owner, and a trail left behind one
   agent. Drawn, not a replay, so the label says so.
   ================================================================= */
{
  const [hot] = HUES.violet;
  const cx = W / 2, cy = H / 2 - 10, R = 230;
  const owners = [
    { c: HUES.violet[0], a: 0.55, dx: -120, dy: -60, r: 92 },
    { c: HUES.cyan[0], a: 0.45, dx: 140, dy: -40, r: 80 },
    { c: HUES.amber[0], a: 0.45, dx: -90, dy: 120, r: 70 },
    { c: HUES.lime[0], a: 0.4, dx: 110, dy: 110, r: 66 },
    { c: HUES.rose[0], a: 0.4, dx: 10, dy: -150, r: 56 },
  ];
  let body = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.6"/>`;
  owners.forEach((o) => {
    body += `<circle cx="${cx + o.dx}" cy="${cy + o.dy}" r="${o.r}" fill="${o.c}" opacity="${o.a}"/>`;
  });
  body += `<path d="M${cx - 60} ${cy + 180} C ${cx - 20} ${cy + 80}, ${cx + 40} ${cy + 60}, ${cx + 200} ${cy + 20}" fill="none" stroke="${hot}" stroke-width="5" stroke-linecap="round"/>`;
  body += `<circle cx="${cx + 200}" cy="${cy + 20}" r="9" fill="${hot}"/>`;
  body += `<text x="${cx + 214}" y="${cy + 14}" font-family="Geist Mono, ui-monospace, monospace" font-size="16" fill="${hot}">YOU</text>`;
  files["poster-papersseum.svg"] = plate(
    `${body}${caption("FIG.05  ARENA", "Five agents, one shared map", "180 seconds, deterministic replays from seed and action log")}`
  );
}

/* =================================================================
   3c. Tripwire: how often Beam cheats, by condition. Numbers from
   beam-tripwire's RESULTS (616 episodes, 44 tasks; low/high = Beam's
   reasoning effort). Control cheats once in 176 episodes.
   ================================================================= */
{
  const [hot] = HUES.rose;
  const rows = [
    { n: "CONTROL", v: 0.006, c: INK, o: 0.35 },
    { n: "IMPOSSIBLE, LOW", v: 0.66, c: hot, o: 0.85 },
    { n: "IMPOSSIBLE, HIGH", v: 0.79, c: hot, o: 0.95 },
    { n: "+ HONESTY, LOW", v: 0.23, c: INK, o: 0.5 },
    { n: "+ HONESTY, HIGH", v: 0.41, c: INK, o: 0.5 },
  ];
  const x0 = 120, y0 = 120, h = 300, bw = 110, gap = 150;
  let bars = "";
  rows.forEach((r, i) => {
    const x = x0 + i * gap;
    const bh = Math.max(4, r.v * h);
    bars += `<rect x="${x}" y="${(y0 + h - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" fill="${r.c}" opacity="${r.o}"/>`;
    bars += `<text x="${x + bw / 2}" y="${(y0 + h - bh - 14).toFixed(1)}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="22" fill="${r.c === hot ? hot : INK}">${Math.round(r.v * 100)}%</text>`;
    bars += `<text x="${x + bw / 2}" y="${y0 + h + 28}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="13" letter-spacing="1" fill="${INK}">${r.n}</text>`;
  });
  files["poster-tripwire.svg"] = plate(
    `${axes(x0 - 30, y0, rows.length * gap, h, "", "CHEAT RATE")}${bars}${caption("FIG.06  TRIPWIRE", "Beam cheats when the test is impossible", "66 to 79% of impossible episodes, 1 in 176 on controls")}`
  );
}

/* =================================================================
   Platform and backend post: the pipeline this site runs on, drawn
   as the path a change takes from commit to live. Themed, like the
   other post covers.
   ================================================================= */
{
  const [hot] = HUES.teal;
  const stages = [
    { n: "COMMIT", s: "main" },
    { n: "CHECK", s: "typecheck" },
    { n: "GENERATE", s: "assets, resume" },
    { n: "BUILD", s: "static site" },
    { n: "DEPLOY", s: "worker or pages" },
  ];
  const y = 200, bw = 176, bh = 96, gap = 34;
  const total = stages.length * bw + (stages.length - 1) * gap;
  const x0 = (1000 - total) / 2;
  let boxes = "", arrows = "";
  stages.forEach((st, i) => {
    const x = x0 + i * (bw + gap);
    const last = i === stages.length - 1;
    boxes += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="${last ? hot : "none"}" opacity="${last ? 0.2 : 1}" stroke="${last ? hot : "var(--lp-line)"}" stroke-width="${last ? 1.5 : 1}"/>
      <text x="${x + bw / 2}" y="${y + 40}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="16" letter-spacing="1" fill="var(--lp-ink)">${st.n}</text>
      <text x="${x + bw / 2}" y="${y + 66}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="13" fill="var(--lp-dim)">${st.s}</text>`;
    if (i < stages.length - 1) {
      const ax = x + bw;
      arrows += `<path d="M${ax + 6} ${y + bh / 2}h${gap - 14}" stroke="${hot}" stroke-width="1.5"/>`;
    }
  });
  const coverChildren = `${arrows}${boxes}
    <text x="${x0}" y="${y - 30}" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1.4" fill="var(--lp-dim)">ONE PATH, FIVE GATES</text>
    <text x="60" y="460" font-family="Geist Mono, ui-monospace, monospace" font-size="17" letter-spacing="1.6" fill="var(--lp-dim)">A CHANGE IS NOT LIVE UNTIL EVERY GATE PASSES</text>`;
  emitThemed(files, "cover-platform", coverChildren, 1000, 500, { grid: false });
}

/* =================================================================
   4. Agent orchestration. Legal-Advisory (NyayaSetu): the complete
   pass, not just the fan-in. A query enters on the left, three
   specialists work it in parallel, Senior Counsel synthesises, and
   an answer exits on the right, because the point of the system is
   the whole pipeline staying truth-grounded end to end, not just
   the final synthesis step.
   ================================================================= */
{
  const [hot] = HUES.violet;
  const midY = H / 2 - 10;
  const specialists = [
    { n: "LEGAL CLERK", s: "static law, Qdrant", y: 150 },
    { n: "AMENDMENT WATCHDOG", s: "live judgments, web search", y: midY },
    { n: "EVIDENCE AUDITOR", s: "video / audio, Gemini", y: 470 },
  ];
  const inX = 150, specX0 = 300, specW = 230, hubX = 830, hubR = 78, outX = 1080;
  let edges = "", nodes = "";
  specialists.forEach((s) => {
    // Input to each specialist.
    edges += `<path d="M${inX + 44} ${midY} C ${(inX + specX0) / 2 + 40} ${midY}, ${(inX + specX0) / 2 + 40} ${s.y}, ${specX0 - 10} ${s.y}" fill="none" stroke="${DIM}" stroke-width="1.5" opacity="0.5"/>`;
    // Specialist to Senior Counsel.
    edges += `<path d="M${specX0 + specW} ${s.y} C ${(specX0 + specW + hubX) / 2} ${s.y}, ${(specX0 + specW + hubX) / 2} ${midY}, ${hubX - hubR - 6} ${midY}" fill="none" stroke="${hot}" stroke-width="1.8" opacity="0.55"/>`;
    nodes += `<g>
      <rect x="${specX0}" y="${s.y - 26}" width="${specW}" height="52" rx="8" fill="none" stroke="${hot}" stroke-width="1.5"/>
      <text x="${specX0 + specW / 2}" y="${s.y - 2}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="0.6" fill="${INK}">${s.n}</text>
      <text x="${specX0 + specW / 2}" y="${s.y + 17}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="12" fill="${DIM}">${s.s}</text>
    </g>`;
  });
  const input = `<g>
    <circle cx="${inX}" cy="${midY}" r="44" fill="none" stroke="${DIM}" stroke-width="1.5"/>
    <text x="${inX}" y="${midY - 3}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="${INK}">USER</text>
    <text x="${inX}" y="${midY + 15}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="${INK}">QUERY</text>
  </g>`;
  const hub = `<g>
    <circle cx="${hubX}" cy="${midY}" r="${hubR}" fill="${hot}" opacity="0.18" stroke="${hot}" stroke-width="1.5"/>
    <text x="${hubX}" y="${midY - 4}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="0.8" fill="${INK}">SENIOR</text>
    <text x="${hubX}" y="${midY + 16}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="0.8" fill="${INK}">COUNSEL</text>
  </g>`;
  const outEdge = `<path d="M${hubX + hubR} ${midY}h${outX - hubX - hubR - 46}" stroke="${hot}" stroke-width="1.8" opacity="0.7"/>
    <path d="M${outX - 54} ${midY - 6}l12 6-12 6" fill="none" stroke="${hot}" stroke-width="1.8"/>`;
  const output = `<g>
    <rect x="${outX - 40}" y="${midY - 34}" width="150" height="68" rx="8" fill="${hot}" opacity="0.16" stroke="${hot}" stroke-width="1.5"/>
    <text x="${outX + 35}" y="${midY - 6}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="${INK}">GROUNDED</text>
    <text x="${outX + 35}" y="${midY + 14}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="${INK}">ADVICE</text>
  </g>`;
  files["poster-nyayasetu.svg"] = plate(
    `${edges}${input}${nodes}${outEdge}${hub}${output}${caption("FIG.04  AGENT ORCHESTRATION", "Query in, verdict out", "LangGraph state machine, three specialists, truth-grounded synthesis")}`
  );
}


/* =================================================================
   Lab visuals. Squarer, quieter: these sit in a 2-up grid, so they
   have to read at half the width of a poster.
   ================================================================= */
const LW = 900, LH = 600;
function labPlate(name, children) {
  emitThemed(files, name, children, LW, LH, { grid: false });
}
function labCaption(t, s) {
  return `<g font-family="Geist Mono, ui-monospace, monospace">
    <text x="36" y="${LH - 46}" font-size="24" fill="var(--lp-ink)" letter-spacing="-0.2">${t}</text>
    <text x="36" y="${LH - 22}" font-size="15" fill="var(--lp-dim)" letter-spacing="0.8">${s}</text>
  </g>`;
}

/* Attention heatmap: one head, a diagonal plus two attention sinks,
   which is what a real head actually looks like. */
{
  const r = rng(88);
  const [hot] = HUES.violet;
  const n = 14, cell = 30, x0 = 36, y0 = 46;
  let cells = "";
  for (let i = 0; i < n; i++) {
    let row = [];
    for (let j = 0; j < n; j++) {
      if (j > i) { row.push(0); continue; }        // causal mask
      let v = j === i ? 0.9 : j === 0 ? 0.55 : 0;   // self + sink on BOS
      v += Math.exp(-Math.abs(i - j) / 2.2) * 0.35;
      v += r() * 0.07;
      row.push(v);
    }
    const s = row.reduce((a, b) => a + b, 0) || 1;
    row = row.map((v) => v / s);
    for (let j = 0; j < n; j++) {
      if (row[j] === 0) {
        cells += `<rect x="${x0 + j * cell}" y="${y0 + i * cell}" width="${cell - 2}" height="${cell - 2}" fill="rgba(255,255,255,0.02)"/>`;
      } else {
        cells += `<rect x="${x0 + j * cell}" y="${y0 + i * cell}" width="${cell - 2}" height="${cell - 2}" fill="${hot}" opacity="${Math.min(1, row[j] * 3.2).toFixed(3)}"/>`;
      }
    }
  }
  labPlate("lab-attention",
    `${cells}
     <text x="${x0 + n * cell + 24}" y="${y0 + 18}" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="var(--lp-dim)">causal mask</text>
     <text x="${x0 + n * cell + 24}" y="${y0 + cell * 1.2}" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="${hot}">sink on token 0</text>
     ${labCaption("Attention, one head", "14 tokens, layer 6, softmax rows sum to 1")}`
  );
}

/* Tokenizer: the same sentence cut into subwords, boundaries shown. */
{
  const [hot] = HUES.cyan;
  const toks = ["Quant", "ization", " is", " a", " measure", "ment", " problem", ",", " not", " a", " compress", "ion", " one", "."];
  let x = 36, y = 120, out = "";
  toks.forEach((t, i) => {
    const w = 15 + t.length * 13.5;
    if (x + w > LW - 36) { x = 36; y += 62; }
    out += `<rect x="${x}" y="${y}" width="${w}" height="44" rx="5" fill="${hot}" opacity="${i % 2 ? 0.16 : 0.28}" stroke="${hot}" stroke-opacity="0.45"/>
      <text x="${x + w / 2}" y="${y + 29}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="17" fill="var(--lp-ink)">${t.replace(/ /g, "&#183;").replace(/,/g, "&#44;")}</text>
      <text x="${x + w / 2}" y="${y + 60}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="12" fill="var(--lp-dim)">${1000 + i * 137}</text>`;
    x += w + 8;
  });
  labPlate("lab-tokenizer",
    `<text x="36" y="70" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1.2" fill="var(--lp-dim)">14 TOKENS  /  62 CHARS  /  4.4 CHARS PER TOKEN</text>
     ${out}${labCaption("Subword boundaries", "BPE, where the model actually splits your words")}`
  );
}

/* Embedding neighbourhood: 2D projection with three clusters and a
   query point, plus its k nearest ringed. */
{
  const r = rng(2027);
  const [hot] = HUES.lime;
  const centres = [[240, 200], [620, 180], [430, 430]];
  let dots = "";
  const pts = [];
  centres.forEach((c, ci) => {
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * 110;
      const p = [c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad * 0.8, ci];
      pts.push(p);
      dots += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.6" fill="${ci === 1 ? hot : DIM}" opacity="${ci === 1 ? 0.85 : 0.4}"/>`;
    }
  });
  const q = [600, 210];
  const near = pts
    .map((p) => ({ p, d: Math.hypot(p[0] - q[0], p[1] - q[1]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);
  let rings = "";
  near.forEach(({ p }) => {
    rings += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="9" fill="none" stroke="${hot}" stroke-width="1.6"/>
      <path d="M${q[0]} ${q[1]}L${p[0].toFixed(1)} ${p[1].toFixed(1)}" stroke="${hot}" stroke-width="1" opacity="0.45"/>`;
  });
  labPlate("lab-embedding",
    `${dots}${rings}
     <circle cx="${q[0]}" cy="${q[1]}" r="7" fill="var(--lp-ink)"/>
     <text x="${q[0] + 14}" y="${q[1] - 10}" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="var(--lp-ink)">query</text>
     ${labCaption("Nearest neighbours", "UMAP to 2D, k=5, cosine distance")}`
  );
}

/* Quantization error: the weight distribution and where INT4 buckets
   land, which is the visual explanation of why INT4 hurts. */
{
  const r = rng(5150);
  const [hot] = HUES.orange;
  const x0 = 36, y0 = 70, w = LW - 72, h = 340;
  let hist = "";
  const bins = 60;
  for (let i = 0; i < bins; i++) {
    const t = (i / bins) * 6 - 3;
    const v = Math.exp(-t * t / 1.4) + r() * 0.03;
    const bh = v * h * 0.92;
    hist += `<rect x="${(x0 + (i * w) / bins).toFixed(1)}" y="${(y0 + h - bh).toFixed(1)}" width="${(w / bins - 2).toFixed(1)}" height="${bh.toFixed(1)}" fill="var(--lp-dim)" opacity="0.35"/>`;
  }
  let buckets = "";
  for (let k = 0; k < 16; k++) {
    const x = x0 + (k / 15) * w;
    buckets += `<path d="M${x.toFixed(1)} ${y0}V${y0 + h}" stroke="${hot}" stroke-width="1.2" opacity="0.6"/>`;
  }
  labPlate("lab-quantization",
    `${hist}${buckets}
     <text x="${x0}" y="${y0 - 16}" font-family="Geist Mono, ui-monospace, monospace" font-size="15" letter-spacing="1.2" fill="var(--lp-dim)">WEIGHT DISTRIBUTION  vs  16 INT4 BUCKETS</text>
     <text x="${x0 + w / 2}" y="${y0 + h + 30}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="${hot}">the tails round to the same bucket. that is the 6.1 points.</text>
     ${labCaption("Where precision goes", "one linear layer, 4.2M weights, symmetric scale")}`
  );
}

/* =================================================================
   Field notes: the fanned strip. Portrait, photo-like, abstract.
   These stand in for photographs, so they are the one place a
   gradient is the right answer rather than a cop-out.
   ================================================================= */
const NOTE_W = 368, NOTE_H = 496;
[
  { f: "note-lab.svg", hue: HUES.amber, seed: 11, cap: "LAB / 03.26", t: "Spindle rig, first run" },
  { f: "note-board.svg", hue: HUES.cyan, seed: 22, cap: "DESK / 05.26", t: "Arduino and a bad solder joint" },
  { f: "note-plot.svg", hue: HUES.lime, seed: 33, cap: "PLOT / 06.26", t: "The run that finally converged" },
  { f: "note-campus.svg", hue: HUES.violet, seed: 44, cap: "JBP / 08.26", t: "Walking back from the lab" },
].forEach(({ f, hue, seed, cap, t }) => {
  const r = rng(seed);
  let shapes = "";
  for (let i = 0; i < 7; i++) {
    const cx = r() * NOTE_W, cy = r() * NOTE_H * 0.8;
    shapes += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(50 + r() * 150).toFixed(0)}" fill="${i % 2 ? hue[0] : hue[1]}" opacity="${(0.1 + r() * 0.2).toFixed(2)}"/>`;
  }
  let rules = "";
  for (let y = 30; y < NOTE_H; y += 30) {
    rules += `<path d="M0 ${y}H${NOTE_W}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
  }
  files[f] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NOTE_W} ${NOTE_H}" width="${NOTE_W}" height="${NOTE_H}" role="img">
  ${defs()}
  <rect width="${NOTE_W}" height="${NOTE_H}" fill="${hue[1]}"/>
  <g filter="url(#blur-soft)">${shapes}</g>
  <defs><filter id="blur-soft"><feGaussianBlur stdDeviation="34"/></filter></defs>
  ${rules}
  <rect width="${NOTE_W}" height="${NOTE_H}" filter="url(#grain)" opacity="1"/>
  <rect x="0" y="${NOTE_H - 92}" width="${NOTE_W}" height="92" fill="rgba(0,0,0,0.55)"/>
  <g font-family="Geist Mono, ui-monospace, monospace">
    <text x="20" y="${NOTE_H - 58}" font-size="13" letter-spacing="1.4" fill="${hue[0]}">${cap}</text>
    <text x="20" y="${NOTE_H - 32}" font-size="15" fill="${INK}">${t}</text>
  </g>
</svg>`;
});

/* =================================================================
   Avatar. A monogram, not a fake face. Generating a synthetic
   portrait of a real person would be worse than not having one.
   ================================================================= */
files["avatar.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2b2b30"/>
      <stop offset="0.55" stop-color="#17171a"/>
      <stop offset="1" stop-color="#0c0c0e"/>
    </linearGradient>
    <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.08"/></feComponentTransfer></filter>
  </defs>
  <rect width="200" height="200" rx="58" fill="url(#a)"/>
  <g stroke="rgba(255,255,255,0.09)" stroke-width="1" fill="none">
    <path d="M0 66H200M0 134H200M66 0V200M134 0V200"/>
  </g>
  <text x="100" y="126" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="72" letter-spacing="-2" fill="#f2f2f2">AR</text>
  <circle cx="152" cy="48" r="7" fill="${HUES.lime[0]}"/>
  <rect width="200" height="200" rx="58" filter="url(#g)"/>
  <rect x="0.5" y="0.5" width="199" height="199" rx="57.5" fill="none" stroke="rgba(255,255,255,0.14)"/>
</svg>`;

/* =================================================================
   Portrait placeholder.

   A head-and-shoulders silhouette on a warm plate, not a synthesised
   face. Generating a photorealistic likeness of a real person to fill
   an avatar slot would be worse than shipping an obvious placeholder,
   so this is obviously a placeholder: swap in a real photo at
   public/mock/avatar-photo.svg (or point the two <img> tags in
   Hero.astro and SiteFooter.astro at a jpg).
   ================================================================= */
files["avatar-photo.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img">
  <defs>
    <linearGradient id="pp" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#e8e4dc"/>
      <stop offset="0.55" stop-color="#cfc9be"/>
      <stop offset="1" stop-color="#a9a29a"/>
    </linearGradient>
    <linearGradient id="pf" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#4a4642"/>
      <stop offset="1" stop-color="#2b2825"/>
    </linearGradient>
    <clipPath id="pc"><rect width="200" height="200" rx="46"/></clipPath>
    <filter id="pg"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="9"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer></filter>
  </defs>
  <g clip-path="url(#pc)">
    <rect width="200" height="200" fill="url(#pp)"/>
    <circle cx="100" cy="74" r="34" fill="url(#pf)"/>
    <path d="M28 200c0-40 32-58 72-58s72 18 72 58Z" fill="url(#pf)"/>
    <rect width="200" height="200" filter="url(#pg)"/>
  </g>
  <rect x="0.5" y="0.5" width="199" height="199" rx="45.5" fill="none" stroke="rgba(0,0,0,0.10)"/>
</svg>`;

/* =================================================================
   Post covers. Quieter than posters: a post is prose, so the cover
   is a diagram fragment rather than a full instrument readout.
   ================================================================= */
const PW = 1000, PH = 500;
[
  {
    f: "cover-baseline.svg",
    hue: HUES.amber,
    label: "WITHOUT A BASELINE, 0.94 IS A DECORATION",
    draw: (r, hue) => {
      let s = "";
      // A big number, then the baseline that deflates it.
      s += `<text x="60" y="230" font-family="Geist Mono, ui-monospace, monospace" font-size="150" fill="var(--lp-ink)" letter-spacing="-6">0.94</text>`;
      s += `<path d="M60 258H430" stroke="${HUES.rose[0]}" stroke-width="3"/>`;
      s += `<text x="60" y="310" font-family="Geist Mono, ui-monospace, monospace" font-size="22" fill="${HUES.rose[0]}">majority class is 0.93</text>`;
      for (let i = 0; i < 40; i++) {
        const x = 560 + (i % 8) * 48, y = 120 + Math.floor(i / 8) * 48;
        s += `<rect x="${x}" y="${y}" width="38" height="38" rx="3" fill="${i % 8 === 0 ? hue[0] : hue[1]}" opacity="${i % 8 === 0 ? 0.8 : 0.35}"/>`;
      }
      return s;
    },
  },
  {
    f: "cover-matrix.svg",
    hue: HUES.lime,
    label: "THE DIAGONAL IS THE PART EVERYONE READS",
    draw: (r, hue) => {
      let s = "";
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        const v = i === j ? 0.85 : Math.abs(i - j) === 1 ? 0.3 : 0.06;
        s += `<rect x="${330 + j * 56}" y="${90 + i * 56}" width="52" height="52" rx="3" fill="${hue[0]}" opacity="${v}"/>`;
      }
      return s;
    },
  },
  {
    f: "cover-quant.svg",
    hue: HUES.orange,
    label: "PRECISION IS A BUDGET, NOT A SETTING",
    draw: (r, hue) => {
      let s = "";
      [1, 0.62, 0.38, 0.19].forEach((v, i) => {
        s += `<rect x="${120 + i * 200}" y="${380 - v * 260}" width="130" height="${v * 260}" fill="${hue[0]}" opacity="${0.85 - i * 0.15}"/>`;
        s += `<text x="${185 + i * 200}" y="410" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="19" fill="var(--lp-dim)">${["FP32", "FP16", "INT8", "INT4"][i]}</text>`;
      });
      return s;
    },
  },
  {
    f: "cover-refusal.svg",
    hue: HUES.cyan,
    label: "A SYSTEM THAT CANNOT REFUSE CANNOT BE TRUSTED",
    draw: (r, hue) => {
      let s = "";
      for (let i = 0; i < 9; i++) {
        const y = 110 + i * 32;
        const ok = i < 4;
        s += `<rect x="330" y="${y}" width="${ok ? 380 : 180}" height="18" rx="9" fill="${ok ? hue[0] : "var(--lp-dim)"}" opacity="${ok ? 0.75 : 0.25}"/>`;
      }
      s += `<path d="M320 ${110 + 4 * 32 - 8}H760" stroke="var(--lp-ink)" stroke-width="1.5" stroke-dasharray="5 5"/>`;
      s += `<text x="770" y="${110 + 4 * 32 - 3}" font-family="Geist Mono, ui-monospace, monospace" font-size="17" fill="var(--lp-ink)">threshold</text>`;
      return s;
    },
  },
  {
    f: "cover-breakpoints.svg",
    hue: HUES.teal,
    label: "FOUR WALLS, FOUR WAYS THROUGH",
    draw: (r, hue) => {
      let s = "";
      const steps = ["MEMORY", "REFUSAL", "THE GAP", "THE DEVICE"];
      steps.forEach((label2, i) => {
        const x = 100 + i * 210;
        const h = 90 + i * 55;
        s += `<rect x="${x}" y="${380 - h}" width="150" height="${h}" fill="${hue[0]}" opacity="${0.35 + i * 0.15}"/>`;
        s += `<circle cx="${x + 75}" cy="${380 - h}" r="5" fill="var(--lp-ink)"/>`;
        s += `<text x="${x + 75}" y="${410}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="16" fill="var(--lp-dim)">${label2}</text>`;
        s += `<text x="${x + 75}" y="${380 - h - 14}" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="17" fill="var(--lp-ink)">0${i + 1}</text>`;
      });
      return s;
    },
  },
].forEach(({ f, hue, label, draw }) => {
  const r = rng(99);
  emitThemed(
    files, f.replace(/\.svg$/, ""),
    `${draw(r, hue)}
     <text x="60" y="${PH - 40}" font-family="Geist Mono, ui-monospace, monospace" font-size="17" letter-spacing="1.6" fill="var(--lp-dim)">${label}</text>`,
    PW, PH, { grid: false }
  );
});

/* =================================================================
   RL and interpretability post. Two themed figures:
   - cover: an illustrative action field over (tilt, offset), with
     the bright ridge where a learned policy fires its engines. It is
     drawn, not measured, and the label says so.
   - diag: the reward shaping lesson. A flat crash penalty scores a
     3 m/s touchdown the same as 30 m/s; the graded penalty does not.
   ================================================================= */
{
  const [hot] = HUES.cyan;
  const cols = 14, rows = 8, cw = 44, ch = 34, ox = 230, oy = 100;
  let cells = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const u = c / (cols - 1) - 0.5, v = r / (rows - 1);
    const ridge = Math.exp(-Math.pow((u * 2.2 + 0.25) * 3.2, 2)) * (0.35 + 0.65 * v);
    cells += `<rect x="${ox + c * cw}" y="${oy + r * ch}" width="${cw - 3}" height="${ch - 3}" rx="2" fill="${hot}" opacity="${(0.06 + 0.9 * ridge).toFixed(3)}"/>`;
  }
  const coverChildren = `${cells}
    <text x="${ox}" y="${oy - 22}" font-family="Geist Mono, ui-monospace, monospace" font-size="16" letter-spacing="1.4" fill="var(--lp-dim)">THRUST BY TILT (ILLUSTRATIVE)</text>
    <text x="60" y="${PH - 40}" font-family="Geist Mono, ui-monospace, monospace" font-size="17" letter-spacing="1.6" fill="var(--lp-dim)">WHERE THE POLICY FIRES, AND WHY</text>`;
  emitThemed(files, "cover-interp-rl", coverChildren, PW, PH, { grid: false });

  const x0 = 150, y0 = 90, w = 700, h = 260;
  const vmax = 30, pen = (v, mode) => (mode === "flat" ? -100 : Math.max(-100, -20 - 8 * v));
  const px = (v) => x0 + (v / vmax) * w;
  const py = (r) => y0 + h - ((r + 100) / 100) * h;
  const pts = (mode) => Array.from({ length: 61 }, (_, i) => i / 2).map((v) => `${px(v).toFixed(1)},${py(pen(v, mode)).toFixed(1)}`).join(" ");
  const diagChildren = `
    <path d="M${x0} ${y0}V${y0 + h}H${x0 + w}" stroke="var(--lp-line)" stroke-width="1.5" fill="none"/>
    <polyline points="${pts("flat")}" fill="none" stroke="var(--lp-dim)" stroke-width="3" stroke-dasharray="6 6"/>
    <polyline points="${pts("graded")}" fill="none" stroke="${hot}" stroke-width="3.5"/>
    <text x="${px(3)}" y="${py(-24) - 14}" font-family="Geist Mono, ui-monospace, monospace" font-size="16" fill="${hot}">3 m/s touchdown</text>
    <text x="${px(30) - 6}" y="${py(-100) - 12}" text-anchor="end" font-family="Geist Mono, ui-monospace, monospace" font-size="16" fill="var(--lp-dim)">flat -100</text>
    <text x="${x0 + w}" y="${y0 + h + 30}" text-anchor="end" font-family="Geist Mono, ui-monospace, monospace" font-size="15" fill="var(--lp-dim)">IMPACT SPEED, M/S</text>
    <text x="${x0 - 12}" y="${y0 - 14}" font-family="Geist Mono, ui-monospace, monospace" font-size="15" fill="var(--lp-dim)">REWARD</text>
    <text x="${px(30)}" y="${py(-100) + 30}" text-anchor="end" font-family="Geist Mono, ui-monospace, monospace" font-size="16" fill="${hot}">graded: -20 - 8v</text>`;
  emitThemed(files, "diag-rl-slope", diagChildren, 1000, 420, { grid: false });
}

/* =================================================================
   Open Graph card. 1200x630, the one asset whose dimensions are
   dictated from outside.
   ================================================================= */
files["og.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img">
  ${defs()}
  <rect width="1200" height="630" fill="url(#plate)"/>
  <g stroke="${FAINT}" stroke-width="1">
    <path d="M216 0V630M984 0V630"/>
  </g>
  <g font-family="Geist Mono, ui-monospace, monospace">
    <text x="216" y="120" font-size="20" letter-spacing="2" fill="${DIM}">EST. 2006</text>
  </g>
  <text x="216" y="330" font-family="Geist, system-ui, sans-serif" font-size="86" font-weight="500" fill="${INK}" letter-spacing="-3">Dhairya Pandya</text>
  <text x="216" y="386" font-family="Geist Mono, ui-monospace, monospace" font-size="26" fill="${DIM}" letter-spacing="0.5">AI Engineer  /  measure it, or it did not happen</text>
  <g font-family="Geist Mono, ui-monospace, monospace" font-size="19" fill="${DIM}" letter-spacing="1.2">
    <text x="216" y="530">6 SYSTEMS</text>
    <text x="400" y="530">3 SHIPPED TO PRODUCTION</text>
    <text x="800" y="530">EVERY NUMBER HAS A BASELINE</text>
  </g>
  <rect width="1200" height="630" filter="url(#grain)" opacity="0.85"/>
</svg>`;

/* =================================================================
   Blog diagrams: light-aware plate.

   Every other generated image in this file is deliberately always
   dark, because it is meant to be an instrument reading, framed
   like a scope trace regardless of what the page around it is
   doing. A diagram embedded inside a paragraph of prose is not
   that: it is part of the page, so it switches to a white canvas
   under `prefers-color-scheme: light` the same way the site's own
   chrome does. CSS custom properties on the root <svg>, read via
   var() in every fill, are what make that possible for a static
   file loaded through a plain <img> tag: an embedded SVG document
   gets its own rendering context and cannot see the host page's
   [data-theme] toggle, only the OS-level media query, so that is
   the signal these respond to.
   ================================================================= */

/**
 * mode "auto" ships one file that follows the OS-level
 * prefers-color-scheme media query, which is the correct no-JS
 * baseline. It CANNOT follow the page's manual [data-theme] toggle,
 * because an <img>-loaded SVG is its own document and never sees
 * the host page's DOM. mode "dark"/"light" instead hardcode the
 * palette with no media query at all, so a tiny client script
 * (initThemedDiagrams in scripts/site.ts) can swap an <img>'s src
 * between the auto file and one of these forced ones whenever the
 * visitor has an EXPLICIT stored theme that might disagree with
 * their OS. Three files per diagram is the cost of an <img> tag
 * actually following a toggle it structurally cannot observe.
 */
function lightPlate(children, w, h, { grid = true, mode = "auto" } = {}) {
  const g = grid
    ? (() => {
        const lines = [];
        for (let x = 40; x < w; x += 40) lines.push(`M${x} 0V${h}`);
        for (let y = 40; y < h; y += 40) lines.push(`M0 ${y}H${w}`);
        return `<path d="${lines.join("")}" stroke="var(--lp-faint)" stroke-width="1" fill="none"/>`;
      })()
    : "";
  const vars = (p) =>
    `--lp-bg-a: ${p.a}; --lp-bg-b: ${p.b}; --lp-ink: ${p.ink}; --lp-dim: ${p.dim}; --lp-line: ${p.line}; --lp-faint: ${p.faint};`;
  const style =
    mode === "auto"
      ? `svg.lp { ${vars(LP_DARK)} } @media (prefers-color-scheme: light) { svg.lp { ${vars(LP_LIGHT)} } }`
      : `svg.lp { ${vars(mode === "light" ? LP_LIGHT : LP_DARK)} }`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" class="lp">
  <style>${style}</style>
  <defs>
    <linearGradient id="lpg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--lp-bg-a)"/>
      <stop offset="1" stop-color="var(--lp-bg-b)"/>
    </linearGradient>
    <filter id="lpgrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.055"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#lpg)"/>
  ${g}
  ${children}
  <rect width="${w}" height="${h}" filter="url(#lpgrain)" opacity="0.9"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="var(--lp-line)"/>
</svg>`;
}

/** Writes the auto file plus forced -dark and -light companions so
 * the client script has something to swap to. `name` excludes the
 * .svg extension. */
function emitThemed(files, name, children, w, h, opts = {}) {
  files[`${name}.svg`] = lightPlate(children, w, h, { ...opts, mode: "auto" });
  files[`${name}-dark.svg`] = lightPlate(children, w, h, { ...opts, mode: "dark" });
  files[`${name}-light.svg`] = lightPlate(children, w, h, { ...opts, mode: "light" });
}

/* -- Shared noise vs. real coupling: a before/after ranking. Two
   loud-but-unrelated columns start on top; correcting for each
   column's own noise sends them to the middle and lets a quiet,
   genuinely coupled pair take the top spot. The intuition is the
   whole point, so the picture is a ranking flipping, not a formula. -- */
{
  const [hot] = HUES.rose;
  const [ok] = HUES.cyan;
  const pairs = [
    { name: "A · B", raw: 0.91, fix: 0.34, note: "both just noisy" },
    { name: "C · D", raw: 0.78, fix: 0.29, note: "both just noisy" },
    { name: "E · F", raw: 0.41, fix: 0.83, note: "quiet, but moves together" },
    { name: "G · H", raw: 0.35, fix: 0.22, note: "" },
  ];
  const colX = [140, 620], y0 = 110, rowH = 74;
  let s = "";
  s += `<text x="${colX[0]}" y="70" font-family="Geist Mono, ui-monospace, monospace" font-size="17" letter-spacing="1" fill="var(--lp-dim)">RAW MUTUAL INFORMATION</text>`;
  s += `<text x="${colX[1]}" y="70" font-family="Geist Mono, ui-monospace, monospace" font-size="17" letter-spacing="1" fill="var(--lp-dim)">AFTER SUBTRACTING NOISE</text>`;
  const rawOrder = [...pairs].sort((a, b) => b.raw - a.raw);
  const fixOrder = [...pairs].sort((a, b) => b.fix - a.fix);
  rawOrder.forEach((p, i) => {
    const y = y0 + i * rowH;
    const c = p.note.includes("quiet") ? ok : p.note ? hot : "var(--lp-dim)";
    s += `<rect x="${colX[0]}" y="${y}" width="${240 * p.raw}" height="26" rx="5" fill="${c}" opacity="0.75"/>
      <text x="${colX[0]}" y="${y - 8}" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="var(--lp-ink)">${p.name}</text>`;
  });
  fixOrder.forEach((p, i) => {
    const y = y0 + i * rowH;
    const c = p.note.includes("quiet") ? ok : p.note ? hot : "var(--lp-dim)";
    s += `<rect x="${colX[1]}" y="${y}" width="${240 * p.fix}" height="26" rx="5" fill="${c}" opacity="0.75"/>
      <text x="${colX[1]}" y="${y - 8}" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="var(--lp-ink)">${p.name}${p.note ? "  " + p.note : ""}</text>`;
  });
  // connecting lines showing where each pair moved to
  pairs.forEach((p) => {
    const ri = rawOrder.indexOf(p), fi = fixOrder.indexOf(p);
    const y1 = y0 + ri * rowH + 13, y2 = y0 + fi * rowH + 13;
    const c = p.note.includes("quiet") ? ok : p.note ? hot : "var(--lp-line)";
    s += `<path d="M${colX[0] + 246} ${y1} C ${(colX[0] + colX[1]) / 2} ${y1}, ${(colX[0] + colX[1]) / 2} ${y2}, ${colX[1] - 6} ${y2}" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/>`;
  });
  emitThemed(files, "diag-coevolution", s, 1000, 420, { grid: false });
}
for (const variant of ["", "-dark", "-light"]) {
  files[`cover-coevolution${variant}.svg`] = files[`diag-coevolution${variant}.svg`];
}

/* -- The blend's report card, written by itself: a score measured
   the leaky way sitting next to the same blend measured honestly.
   One bar drops. That is the entire finding, so that is the entire
   picture. -- */
{
  const [hot] = HUES.violet;
  const [ok] = HUES.lime;
  const rows = [
    { n: "MODEL A", v: 0.71, c: "var(--lp-dim)" },
    { n: "MODEL B", v: 0.69, c: "var(--lp-dim)" },
    { n: "MODEL C", v: 0.66, c: "var(--lp-dim)" },
    { n: "BLEND, SCORED ON ITS OWN FIT ROWS", v: 0.83, c: hot },
    { n: "BLEND, SCORED ON A HELD-OUT SPLIT", v: 0.74, c: ok },
  ];
  const x0 = 340, y0 = 90, rowH = 56, maxW = 560;
  let s = "";
  rows.forEach((r, i) => {
    const y = y0 + i * rowH;
    s += `<text x="${x0 - 16}" y="${y + 18}" text-anchor="end" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="var(--lp-ink)">${r.n}</text>`;
    s += `<rect x="${x0}" y="${y}" width="${maxW * r.v}" height="26" rx="5" fill="${r.c}" opacity="0.8"/>`;
    s += `<text x="${x0 + maxW * r.v + 10}" y="${y + 18}" font-family="Geist Mono, ui-monospace, monospace" font-size="14" fill="${r.c === "var(--lp-dim)" ? "var(--lp-dim)" : r.c}">${r.v.toFixed(2)}</text>`;
  });
  s += `<path d="M${x0} ${y0 + 3 * rowH - 10}H${x0 + maxW + 70}" stroke="var(--lp-line)" stroke-width="1" stroke-dasharray="4 4"/>`;
  s += `<text x="${x0}" y="${y0 + 5 * rowH + 26}" font-family="Geist Mono, ui-monospace, monospace" font-size="13" fill="var(--lp-dim)">same weights, same models. only the rows they were graded on changed.</text>`;
  emitThemed(files, "diag-stack-honesty", s, 1000, 420, { grid: false });
}
for (const variant of ["", "-dark", "-light"]) {
  files[`cover-stack${variant}.svg`] = files[`diag-stack-honesty${variant}.svg`];
}

/* ---- write ------------------------------------------------------ */
let bytes = 0;
for (const [name, body] of Object.entries(files)) {
  writeFileSync(join(OUT, name), body, "utf8");
  bytes += Buffer.byteLength(body);
}
console.log(`wrote ${Object.keys(files).length} files, ${(bytes / 1024).toFixed(1)} KB to public/mock`);
for (const n of Object.keys(files).sort()) console.log("  " + n);
