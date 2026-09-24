/**
 * Generates the favicon set, the app icons and the Open Graph image.
 *
 * WHY THIS EXISTS, and it is not cosmetic:
 *
 *  - The shipped favicon was Astro's logo. A deployed personal site
 *    wearing the framework's mark is a bug, not a default.
 *  - og:image was an SVG. X, LinkedIn, Slack, WhatsApp, Facebook and
 *    iMessage all refuse SVG for social previews, so every share of
 *    this site rendered with no image at all. OG images must be PNG or
 *    JPEG, at 1200x630, from an absolute URL.
 *
 * SOURCE OF TRUTH: public/favicon.svg is HAND-AUTHORED and is never
 * written by this script. Every raster below is derived from it, so the
 * vector and the PNGs cannot disagree about what the mark is. Replace
 * that one file, rebuild, and the whole set follows.
 *
 * (It used to generate favicon.svg too, which meant a designer's
 * replacement was silently overwritten by the next `npm run build`.
 * The dependency now runs the correct way round: author the vector,
 * derive the rasters.)
 *
 * STACK CHOICE: sharp, as a devDependency. Alternatives were
 * @resvg/resvg-js (smaller, rasterise-only) or @vercel/og (needs an
 * edge runtime this static site does not have). sharp is what Astro's
 * own image service uses, so it is the least surprising dep here, and
 * it rasterises, resizes and composites in one library.
 *
 * Run: node scripts/gen-icons.mjs   (wired into `prebuild`)
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
mkdirSync(PUBLIC, { recursive: true });

const wrote = [];
const save = (name, buf) => {
  writeFileSync(join(PUBLIC, name), buf);
  wrote.push(`${name} (${(buf.length / 1024).toFixed(1)}KB)`);
};

/* ================================================================
   The mark
   ================================================================ */
const FAVICON = join(PUBLIC, "favicon.svg");

let markSource;
let markOrigin;
if (existsSync(FAVICON)) {
  markSource = readFileSync(FAVICON);
  markOrigin = "public/favicon.svg (authored)";
} else {
  /* Fallback so a fresh clone that stripped the file still builds a
     complete icon set instead of failing on a missing input. */
  const size = 512;
  markSource = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#1e1e1d"/>
      <text x="50%" y="50%" dy="0.355em" text-anchor="middle"
            font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
            font-weight="600" font-size="${Math.round(size * 0.44)}"
            fill="#f7f7f5">AR</text>
    </svg>`
  );
  markOrigin = "generated fallback (no favicon.svg found)";
  writeFileSync(FAVICON, markSource);
}

/**
 * Minimal ICO container wrapping a PNG.
 *
 * ICO has allowed embedded PNG payloads since Vista, so this is a
 * 22-byte header plus the PNG. Worth doing rather than dropping
 * favicon.ico: crawlers and older clients still request it by
 * convention, and a 404 in every deploy's logs is noise nobody wants
 * to triage later.
 */
function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // payload offset
  return Buffer.concat([header, entry, png]);
}

/* density 512 so the vector rasterises well above the target size
   before downscaling. Rendering a 175pt SVG straight to 32px gives
   visibly softer edges than rendering large and resampling down. */
for (const size of [32, 96, 180, 192, 512]) {
  const png = await sharp(markSource, { density: 512 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  if (size === 180) save("apple-touch-icon.png", png);
  else if (size === 32) {
    save("favicon-32.png", png);
    save("favicon.ico", icoFromPng(png, 32));
  } else save(`icon-${size}.png`, png);
}

/* ================================================================
   Open Graph: the hero section, at card size

   Composed rather than screenshotted, and built from the same strings
   src/config/site.ts renders, parsed out of that file so the card can
   never quietly disagree with the page. A regex miss throws: a wrong
   OG card is worse than a failed build, because nobody notices it.
   ================================================================ */
const siteTs = readFileSync(join(ROOT, "src", "config", "site.ts"), "utf8");
const field = (key) => {
  /* Built from a string, not a template literal: `\s` inside a
     template literal is an invalid escape that collapses to a bare
     "s", silently turning this into `name:s*"..."` and matching
     nothing. */
  const m = siteTs.match(new RegExp(key + ':\\s*"([^"]+)"'));
  if (!m) throw new Error("gen-icons: could not read " + key + " from site.ts");
  return m[1];
};

const NAME = field("name");
const ROLE = field("role");
const TAGLINE = field("tagline");
const AVAILABILITY = field("availability");
const BUILDS = field("builds");

/*
 * SCALE renders everything at 2x and resizes down at the end, so the
 * text is crisp AND the output is exactly 1200x630.
 *
 * This is the bug that made the first version wrong: passing
 * `density: 200` to a 1200x630 SVG produced a 3333x1750 image, so the
 * composited avatar landed at 96px into a 3333px canvas (three times
 * too close to the corner, three times too small) and the declared
 * og:image:width of 1200 was a lie that crawlers lay out against.
 */
const SCALE = 2;
const W = 1200;
const H = 630;
const PAD = 88;
const AV = 132;

const escapeXml = (t) =>
  t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** SVG text does not wrap, so the bio is measured and split here. */
function wrap(text, maxChars, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines.slice(0, maxLines);
}

const bioLines = wrap("I build " + BUILDS + ".", 58, 2);

const s = (n) => n * SCALE;
const SANS = "Geist, Inter, system-ui, -apple-system, Segoe UI, sans-serif";
const MONO = "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace";

const ogBase = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${s(W)}" height="${s(H)}" viewBox="0 0 ${s(W)} ${s(H)}">
    <rect width="${s(W)}" height="${s(H)}" fill="#f7f7f5"/>

    <!-- The two column rules: the site's signature, free here. -->
    <g stroke="rgba(0,0,0,0.07)" stroke-width="${SCALE}">
      <path d="M${s(56)} 0V${s(H)}M${s(W - 56)} 0V${s(H)}"/>
    </g>

    <text x="${s(PAD)}" y="${s(292)}" font-family="${SANS}" font-size="${s(70)}"
          font-weight="500" letter-spacing="${s(-2.2)}" fill="#1e1e1d">${escapeXml(NAME)}</text>

    <text x="${s(PAD)}" y="${s(340)}" font-family="${MONO}" font-size="${s(27)}"
          fill="#5a5a58">${escapeXml(ROLE)}  /  ${escapeXml(TAGLINE)}</text>

    ${bioLines
      .map(
        (line, i) =>
          `<text x="${s(PAD)}" y="${s(410 + i * 36)}" font-family="${SANS}" font-size="${s(26)}" fill="#5a5a58">${escapeXml(line)}</text>`
      )
      .join("\n    ")}

    <circle cx="${s(PAD + 8)}" cy="${s(541)}" r="${s(8)}" fill="#157f3d"/>
    <text x="${s(PAD + 30)}" y="${s(550)}" font-family="${SANS}" font-size="${s(26)}"
          fill="#5a5a58">${escapeXml(AVAILABILITY)}</text>
  </svg>`
);

/*
 * TWO PASSES, and it has to be two.
 *
 * sharp applies resize EARLY in its pipeline, before composite,
 * regardless of the order the methods are called in. Chaining
 * .composite().resize() therefore halved the 2x base first and then
 * pasted the 2x avatar onto it, landing the portrait at double size
 * and double offset, straight through the name. So: resize the text
 * layer to final size first, then composite a 1x avatar onto it.
 */
const ogFlat = await sharp(ogBase).resize(W, H).png().toBuffer();

/* The portrait, masked to the hero's squircle so the card carries a
   real face rather than a placeholder block.

   Also two passes, for the same reason: resize and composite cannot
   share a chain here, or sharp resizes first and then refuses a mask
   that is now larger than its target. Crop to final size, then mask. */
const avatarSquare = await sharp(join(PUBLIC, "avatar.jpg"))
  .resize(AV, AV, { fit: "cover" })
  .png()
  .toBuffer();

const avatarRounded = await sharp(avatarSquare)
  .composite([
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${AV}" height="${AV}">
           <rect width="${AV}" height="${AV}" rx="${Math.round(AV * 0.29)}" fill="#fff"/>
         </svg>`
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

const ogPng = await sharp(ogFlat)
  .composite([{ input: avatarRounded, top: PAD, left: PAD }])
  .png({ compressionLevel: 9 })
  .toBuffer();
save("og.png", ogPng);

/* ================================================================
   Web app manifest
   ================================================================ */
const manifest = {
  name: NAME + ", " + ROLE,
  short_name: NAME,
  description: "I build " + BUILDS + ".",
  start_url: "/",
  display: "standalone",
  background_color: "#f7f7f5",
  theme_color: "#f7f7f5",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};
save("site.webmanifest", Buffer.from(JSON.stringify(manifest, null, 2) + "\n"));

console.log("mark source: " + markOrigin);
console.log(`wrote ${wrote.length} files to public/`);
for (const w of wrote) console.log("  " + w);
