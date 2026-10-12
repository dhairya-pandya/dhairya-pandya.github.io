/**
 * The hero's three enhancements. The letter is readable without any
 * of them; each one fails by doing nothing.
 *
 *   initBanner  mounts the dithered warp field (vanilla paper-shaders)
 *   initEditor  wires the format bar on "AI engineer"
 *   initPeek    lifts and moves the card pairs over three entities
 *
 * Values are the ones settled in /playground/hero.
 */
import {
  ShaderMount,
  ditheringFragmentShader,
  getShaderColorFromString,
  DitheringShapes,
  DitheringTypes,
  ShaderFitOptions,
} from "@paper-design/shaders";

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------
   Banner
   ------------------------------------------------------------------ */

const BANNER_SPEED = 0.1;

function initBanner(hero: HTMLElement) {
  const host = hero.querySelector<HTMLElement>("[data-hero-banner-canvas]");
  if (!host) return;

  let mount: ShaderMount;
  try {
    mount = new ShaderMount(
      host,
      ditheringFragmentShader,
      {
        u_colorBack: getShaderColorFromString("#00000000"),
        u_colorFront: getShaderColorFromString("#7a7a7a"),
        u_shape: DitheringShapes.warp,
        u_type: DitheringTypes["4x4"],
        u_pxSize: 2,
        u_fit: ShaderFitOptions.cover,
        u_scale: 0.12,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0,
      },
      undefined,
      reduceMotion() ? 0 : BANNER_SPEED,
    );
  } catch (err) {
    /* No WebGL (disabled, blocklisted GPU, some headless browsers).
       The banner is decoration, so it goes and the ground stays. */
    hero.querySelector("[data-hero-banner]")?.remove();
    console.warn("Hero banner skipped: WebGL unavailable.", err);
    return;
  }

  /* A still frame under reduced motion, and no GPU work at all once
     the hero has scrolled away. */
  const io = new IntersectionObserver(([entry]) => {
    mount.setSpeed(entry.isIntersecting && !reduceMotion() ? BANNER_SPEED : 0);
  });
  io.observe(host);
}

/* ------------------------------------------------------------------
   Editor
   ------------------------------------------------------------------ */

const FONTS: Record<string, { label: string; family: string; size?: string }> = {
  sans: { label: "Geist", family: "var(--font-sans)" },
  mono: { label: "Mono", family: "var(--font-mono)" },
  serif: { label: "Serif", family: "'Instrument Serif', Georgia, serif", size: "1.12em" },
};

/* The serif is only fetched if someone actually picks it. */
function loadSerif() {
  if (document.getElementById("hero-serif")) return;
  const link = document.createElement("link");
  link.id = "hero-serif";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap";
  document.head.appendChild(link);
}

function initEditor(hero: HTMLElement) {
  const sel = hero.querySelector<HTMLElement>("[data-sel]");
  const phrase = sel?.querySelector<HTMLElement>("[data-sel-phrase]");
  if (!sel || !phrase) return;

  const triggers = sel.querySelectorAll<HTMLButtonElement>("[data-sel-menu]");
  const panels = sel.querySelectorAll<HTMLElement>("[data-sel-panel]");
  const fontLabel = sel.querySelector<HTMLElement>("[data-sel-font-label]");
  const dot = sel.querySelector<HTMLElement>("[data-sel-dot]");

  const setOpen = (name: string | null) => {
    triggers.forEach((t) => t.setAttribute("aria-expanded", String(t.dataset.selMenu === name)));
    panels.forEach((p) => p.toggleAttribute("data-open", p.dataset.selPanel === name));
  };

  triggers.forEach((t) =>
    t.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = t.getAttribute("aria-expanded") === "true" ? null : (t.dataset.selMenu ?? null);
      /* Fetch the serif as the menu opens, not on pick: picking it
         later would reflow the phrase and slide the bar under the
         reader's next click. */
      if (next === "font") loadSerif();
      setOpen(next);
    }),
  );

  sel.querySelectorAll<HTMLButtonElement>("[data-font]").forEach((item) =>
    item.addEventListener("click", () => {
      const f = FONTS[item.dataset.font ?? "sans"];
      if (item.dataset.font === "serif") loadSerif();
      phrase.style.fontFamily = f.family;
      phrase.style.fontSize = f.size ?? "";
      if (fontLabel) {
        fontLabel.textContent = f.label;
        fontLabel.style.fontFamily = f.family;
      }
      sel.querySelectorAll("[data-font]").forEach((i) => i.setAttribute("aria-checked", String(i === item)));
      setOpen(null);
    }),
  );

  const toggle = (attr: string, apply: (on: boolean) => void) => {
    const b = sel.querySelector<HTMLButtonElement>(`[${attr}]`);
    b?.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      apply(on);
    });
  };
  toggle("data-sel-bold", (on) => (phrase.style.fontWeight = on ? "650" : ""));
  toggle("data-sel-italic", (on) => (phrase.style.fontStyle = on ? "italic" : ""));

  sel.querySelectorAll<HTMLButtonElement>(".sel-swatch").forEach((sw) =>
    sw.addEventListener("click", () => {
      const tone = sw.dataset.tone ?? "neutral";
      const ink = tone === "neutral" ? "" : `var(--color-${tone})`;
      phrase.style.color = ink;
      if (dot) dot.style.background = ink || "var(--color-ink)";
      sel.querySelectorAll(".sel-swatch").forEach((s) => s.setAttribute("aria-checked", String(s === sw)));
      setOpen(null);
    }),
  );

  document.addEventListener("pointerdown", (e) => {
    if (!sel.contains(e.target as Node)) setOpen(null);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(null);
  });
}

/* ------------------------------------------------------------------
   Peek
   ------------------------------------------------------------------ */

/* Grace between leaving an entity and closing, so the trip from the
   word onto the cards it lifted doesn't read as a flicker. */
const CLOSE_DELAY = 320;
/* Per-frame share of the remaining distance. ~0.2 at 60fps settles in
   roughly the lab's 0.28s follow spring, without its overshoot. */
const FOLLOW = 0.2;

function initPeek(hero: HTMLElement) {
  const layer = hero.querySelector<HTMLElement>("[data-peek-layer]");
  if (!layer) return;
  const groups = new Map<string, HTMLElement>();
  hero.querySelectorAll<HTMLElement>("[data-peek-group]").forEach((g) => groups.set(g.dataset.peekGroup!, g));
  const triggers = hero.querySelectorAll<HTMLElement>("[data-peek]");

  let open: string | null = null;
  let closeTimer: number | undefined;
  let tx = 0, ty = 0, px = 0, py = 0;
  let raf = 0;

  const apply = () => {
    layer.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  };
  const tick = () => {
    px += (tx - px) * FOLLOW;
    py += (ty - py) * FOLLOW;
    apply();
    raf = Math.abs(tx - px) + Math.abs(ty - py) > 0.4 ? requestAnimationFrame(tick) : 0;
  };

  const place = (clientX: number, clientY: number, jump: boolean) => {
    const r = hero.getBoundingClientRect();
    /* Keep the pair on screen: half its width, scaled like the CSS. */
    const half = Math.min(r.width / 2, (window.innerWidth < 640 ? 0.7 : 1) * 240);
    tx = Math.max(half, Math.min(r.width - half, clientX - r.left));
    ty = clientY - r.top;
    if (jump || reduceMotion()) {
      px = tx;
      py = ty;
      apply();
      return;
    }
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const anchor = (el: HTMLElement, jump: boolean) => {
    const b = el.getBoundingClientRect();
    place(b.left + b.width / 2, b.top, jump);
  };

  const cancelClose = () => window.clearTimeout(closeTimer);

  const show = (id: string, el: HTMLElement, e?: PointerEvent) => {
    cancelClose();
    const jump = open === null;
    open = id;
    groups.forEach((g, key) => g.toggleAttribute("data-open", key === id));
    triggers.forEach((t) => t.setAttribute("aria-expanded", String(t === el)));
    hero.setAttribute("data-peeking", "");
    if (e && e.pointerType === "mouse") place(e.clientX, e.clientY - 6, jump);
    else anchor(el, jump);
  };

  const close = () => {
    cancelClose();
    open = null;
    groups.forEach((g) => g.removeAttribute("data-open"));
    triggers.forEach((t) => t.setAttribute("aria-expanded", "false"));
    hero.removeAttribute("data-peeking");
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer = window.setTimeout(close, CLOSE_DELAY);
  };

  triggers.forEach((el) => {
    const id = el.dataset.peek!;
    if (!groups.has(id)) return;
    el.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && show(id, el, e));
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" && open === id) place(e.clientX, e.clientY - 6, false);
    });
    el.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && scheduleClose());
    /* Keyboard focus only. A tap also focuses the element, and opening
       on that focus made the tap's own click toggle the pair shut. */
    el.addEventListener("focus", () => {
      if (el.matches(":focus-visible")) show(id, el);
    });
    el.addEventListener("blur", scheduleClose);
    /* Touch has no hover: a tap toggles, anchored to the word. */
    el.addEventListener("click", (e) => {
      if ((e as PointerEvent).pointerType === "mouse") return;
      if (open === id) close();
      else show(id, el);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (open === id) close();
        else show(id, el);
      }
    });
  });

  /* An open group owns the pointer: its cards, plus an invisible
     bridge (the group's ::after) spanning the gap from the anchor up to
     the cards. That is what lets the pointer travel off the entity and
     onto a photo with no dead space to cross, so no race against the
     close timer. */
  groups.forEach((g) => {
    g.addEventListener("pointerenter", cancelClose);
    g.addEventListener("pointerleave", scheduleClose);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) close();
  });
  document.addEventListener("pointerdown", (e) => {
    const t = e.target as HTMLElement;
    if (open && e.pointerType !== "mouse" && !t.closest("[data-peek]") && !t.closest(".peek-card")) close();
  });
}

export function initHero() {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  initBanner(hero);
  initEditor(hero);
  initPeek(hero);
}
