/**
 * Field-note photographs, discovered from public/notes/ at build time.
 *
 * WHY A DIRECTORY SCAN RATHER THAN A LIST.
 *
 * The previous version hardcoded four paths to generated SVG
 * placeholders in the home page's frontmatter. Swapping in real
 * photographs meant editing that array every time, and an array of
 * paths silently rots the moment a file is renamed: the page keeps
 * building and the strip renders four broken images, because a 404 on
 * an <img> is not a build error.
 *
 * Reading the directory instead means adding a photograph is dropping
 * a file in, and removing one cannot leave a dangling reference.
 *
 * ALT TEXT is the one thing a filename cannot supply honestly, so it
 * comes from `captions` below, keyed by filename without extension.
 * A file with no entry still renders, with alt text derived from its
 * name, and the build logs which ones need writing. Silently shipping
 * `alt=""` on a photograph is how a portfolio becomes unreadable to a
 * screen reader without anyone noticing.
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Note {
  src: string;
  alt: string;
}

/** Extensions the strip can render. */
const EXT = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

/**
 * Written alt text, keyed by filename stem. Add an entry when you add
 * a photograph; the stem is the filename without its extension, so
 * `lab-rig.jpg` is keyed `lab-rig`.
 */
const captions: Record<string, string> = {
  "note-lab": "The spindle test rig on its first instrumented run",
  "note-board": "An Arduino board mid-repair on a desk",
  "note-plot": "A training curve on a laptop screen, finally converging",
  "note-campus": "The walk back from the lab at dusk",
};

/** "lab-rig-02" -> "Lab rig 02". A fallback, not a substitute. */
const fromStem = (stem: string) =>
  stem.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function fieldNotes(root: string): Note[] {
  const dir = join(root, "public", "notes");

  if (existsSync(dir)) {
    const files = readdirSync(dir)
      .filter((f) => EXT.test(f))
      /* Sorted by filename so the fan order is stable across builds
         and controllable by prefixing 01-, 02-. readdir order is
         filesystem-dependent and would otherwise reshuffle the strip
         on someone else's machine. */
      .sort((a, b) => a.localeCompare(b, "en"));

    if (files.length > 0) {
      const missing: string[] = [];
      const notes = files.map((f) => {
        const stem = f.replace(EXT, "");
        if (!captions[stem]) missing.push(f);
        return { src: `/notes/${f}`, alt: captions[stem] ?? fromStem(stem) };
      });
      if (missing.length) {
        console.warn(
          `[notes] no written alt text for: ${missing.join(", ")}\n` +
            `        add entries to captions{} in src/lib/notes.ts; ` +
            `using the filename meanwhile.`
        );
      }
      return notes;
    }
  }

  /* Nothing dropped in yet: fall back to the generated placeholders so
     the strip is never empty and the layout can still be judged. */
  return [
    { src: "/mock/note-lab.svg", alt: captions["note-lab"] },
    { src: "/mock/note-board.svg", alt: captions["note-board"] },
    { src: "/mock/note-plot.svg", alt: captions["note-plot"] },
    { src: "/mock/note-campus.svg", alt: captions["note-campus"] },
  ];
}
