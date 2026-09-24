/**
 * Client behaviour, one entry point.
 *
 * Every initialiser is written to be a no-op when its markup is
 * absent, so the same bundle runs on every page without guards at
 * the call site. Nothing here is required for the page to be
 * readable: the site is server-rendered and all of this is
 * enhancement over working HTML.
 */

const mql = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shortcuts must never fire while the user is typing. */
function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  );
}

/* ============================================================
   Theme
   ============================================================ */
function initTheme() {
  const root = document.documentElement;

  /* System first: with no attribute set, the OS preference is the
     theme. The toggle therefore flips against the EFFECTIVE theme,
     not the attribute, or the first click on a system-dark visitor
     would set "dark" and appear to do nothing. */
  const effective = (): "dark" | "light" => {
    if (root.dataset.theme === "dark" || root.dataset.theme === "light") {
      return root.dataset.theme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const apply = (theme: "dark" | "light") => {
    root.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* private mode: the toggle still works for this session */
    }
    syncThemedDiagrams();
  };

  document.querySelectorAll<HTMLElement>("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      apply(effective() === "light" ? "dark" : "light");
    });
  });

  /* A visitor who never touched the toggle keeps following the OS:
     if the system theme changes mid-visit, so does the page. Anyone
     with a stored choice has opted out of that. */
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      try {
        if (!localStorage.getItem("theme")) delete root.dataset.theme;
      } catch {
        /* no storage: attribute was never set, nothing to do */
      }
      syncThemedDiagrams();
    });

  /* Writing-section diagrams (gen-mock.mjs, /mock/cover-*, diag-*,
     lab-*) are static SVGs loaded through a plain <img>: each one is
     its own document and structurally cannot see this page's
     [data-theme] attribute, only prefers-color-scheme. The base file
     already follows the OS via CSS, which is the correct no-JS
     baseline; this only has to step in when the visitor has an
     EXPLICIT stored theme that might disagree with the OS, by
     swapping to the -dark or -light sibling file gen-mock.mjs wrote
     for exactly this. Following the system needs no override, so the
     base file is restored. */
  const themedDiagramSelector =
    'img[src^="/mock/cover-"], img[src^="/mock/diag-"], img[src^="/mock/lab-"]';
  function syncThemedDiagrams() {
    const explicit = effective_stored();
    document
      .querySelectorAll<HTMLImageElement>(themedDiagramSelector)
      .forEach((img) => {
        const base = (img.getAttribute("src") || "").replace(
          /-(dark|light)\.svg$/,
          ".svg"
        );
        if (!base) return;
        const target = explicit
          ? base.replace(/\.svg$/, `-${explicit}.svg`)
          : base;
        if (img.getAttribute("src") !== target) img.setAttribute("src", target);
      });
  }
  function effective_stored(): "dark" | "light" | null {
    return root.dataset.theme === "dark" || root.dataset.theme === "light"
      ? root.dataset.theme
      : null;
  }

  syncThemedDiagrams();
}

/* ============================================================
   HUMAN / MACHINE view switch

   The radio group is the control; this only mirrors its state onto
   <html data-mode> and persists it. CSS decides what that means, so
   there is one source of truth and no chance of both views showing.
   ============================================================ */
function initMode() {
  const group = document.querySelector<HTMLElement>("[data-mode-switch]");
  if (!group) return;
  const root = document.documentElement;

  const inputs = Array.from(
    group.querySelectorAll<HTMLInputElement>('input[name="view-mode"]')
  );
  if (!inputs.length) return;

  /* The inline head script set data-mode before paint, so the radios
     have to be brought into line with it rather than the reverse. */
  const current = root.dataset.mode === "machine" ? "machine" : "human";
  inputs.forEach((i) => (i.checked = i.value === current));

  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      root.dataset.mode = input.value;
      try {
        localStorage.setItem("mode", input.value);
      } catch {
        /* private mode: the switch still works for this session */
      }
      /* Switching view changes what is on screen entirely, so the
         reader is put back at the top rather than left at a scroll
         offset that means nothing in the other view. */
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    });
  });
}

/* ============================================================
   Copy the whole machine document
   ============================================================ */
function initCopyMachine() {
  document
    .querySelectorAll<HTMLElement>("[data-copy-machine]")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const doc = document.querySelector<HTMLElement>("[data-machine-doc]");
        if (!doc) return;
        const ok = await writeClipboard(doc.textContent ?? "");
        confirmCopy(btn, ok);
      });
    });
}

/* ============================================================
   Local clock

   Rendered server-side first so the value is never blank, then
   taken over here and ticked. Seconds are shown because a clock
   that only shows minutes looks broken for up to 60 seconds.
   ============================================================ */
function initClock() {
  const nodes = document.querySelectorAll<HTMLElement>("[data-clock]");
  if (!nodes.length) return;

  const fmts = new Map<string, Intl.DateTimeFormat>();
  const fmtFor = (tz: string) => {
    let f = fmts.get(tz);
    if (!f) {
      f = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: nodes[0]?.dataset.seconds === "false" ? undefined : "2-digit",
        hour12: false,
      });
      fmts.set(tz, f);
    }
    return f;
  };

  const tick = () => {
    const now = new Date();
    nodes.forEach((n) => {
      const tz = n.dataset.tz || "Asia/Kolkata";
      try {
        n.textContent = fmtFor(tz).format(now);
      } catch {
        /* An unknown IANA zone would throw on every tick; leave the
           server-rendered value in place instead. */
      }
    });
  };

  tick();
  window.setInterval(tick, 1000);
}

/**
 * How far ahead or behind the viewer is, e.g. "4h 30m behind you".
 * Written into any [data-tz-offset] node. This is the detail that
 * turns a clock from decoration into information: it tells a
 * recruiter in London whether it is reasonable to call.
 */
function initTimezoneDelta() {
  const nodes = document.querySelectorAll<HTMLElement>("[data-tz-offset]");
  if (!nodes.length) return;

  nodes.forEach((n) => {
    const tz = n.dataset.tzOffset || "Asia/Kolkata";
    try {
      const now = new Date();
      /* Format the same instant in both zones and diff the wall
         clocks. Comparing UTC offsets directly would need the zone's
         current DST state, which this avoids entirely. */
      const there = new Date(
        now.toLocaleString("en-US", { timeZone: tz })
      ).getTime();
      const here = new Date(now.toLocaleString("en-US")).getTime();
      const mins = Math.round((there - here) / 60000);

      if (Math.abs(mins) < 5) {
        n.textContent = "same as you";
        return;
      }
      const sign = mins > 0 ? "ahead of" : "behind";
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      const span = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      n.textContent = `${span} ${sign} you`;
    } catch {
      n.textContent = "";
    }
  });
}

/* ============================================================
   Copy to clipboard

   Used by the dock button, the hero row and the C shortcut. All
   three route through one function so the confirmation is
   identical wherever it is triggered.
   ============================================================ */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  /* Fallback for insecure contexts and older browsers. execCommand
     is deprecated but it is the only thing that works on http, and
     silently failing to copy is worse than using it. */
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function confirmCopy(host: HTMLElement, ok: boolean) {
  const label = host.querySelector<HTMLElement>("[data-copy-label]");
  const original = label?.dataset.original ?? label?.textContent ?? "";
  if (label && !label.dataset.original) label.dataset.original = original;

  host.setAttribute("data-copied", "");
  if (label) {
    label.textContent = ok ? "Copied" : "Press Ctrl C";
    /* Reflow between removing and re-adding the class is what
       guarantees the swap animation replays on a second copy. */
    label.classList.remove("is-swapped");
    void label.offsetWidth;
    label.classList.add("is-swapped");
  }

  window.setTimeout(() => {
    host.removeAttribute("data-copied");
    if (label) {
      label.textContent = label.dataset.original || original;
      label.classList.remove("is-swapped");
      void label.offsetWidth;
      label.classList.add("is-swapped");
    }
  }, 1800);
}

function initCopy() {
  const buttons = document.querySelectorAll<HTMLElement>("[data-copy-email]");

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.dataset.copyEmail || "";
      /* The tooltip holds the label, and it is a sibling of the
         button rather than a child, so the confirmation host is the
         wrapper when there is one. */
      const host = btn.closest<HTMLElement>(".t-tt-wrap") ?? btn;
      confirmCopy(host, await writeClipboard(value));
    });
  });

  document.addEventListener("keydown", async (e) => {
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.toLowerCase() !== "c") return;
    const first = buttons[0];
    if (!first) return;
    e.preventDefault();
    const host = first.closest<HTMLElement>(".t-tt-wrap") ?? first;
    confirmCopy(host, await writeClipboard(first.dataset.copyEmail || ""));
  });
}

/* ============================================================
   transitions.dev / 11-avatar-group-hover

   Distance-falloff lift on the dock. The timing-function is set
   inline BEFORE the variable writes: the browser uses whatever
   timing-function is current at the moment a transitionable
   property changes, which is what gives a clean curve on the way
   up and a sprung overshoot on the way back without a second
   class or a second transition declaration.
   ============================================================ */
function initDockHover() {
  const root = document.querySelector<HTMLElement>(".t-avatar-group");
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(".t-avatar"));
  if (!items.length) return;

  const cs = getComputedStyle(document.documentElement);
  const num = (name: string, fb: number) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fb;
  };
  const ease = (name: string, fb: string) =>
    cs.getPropertyValue(name).trim() || fb;

  function setShifts(activeIdx: number | null, phase: "in" | "out") {
    if (mql()) return;
    const lift = num("--avatar-lift", -7);
    const falloff = num("--avatar-falloff", 0.42);
    const scale = num("--avatar-scale", 1.14);
    const tf =
      phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");

    items.forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx === null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty(
        "--shift",
        (lift * Math.pow(falloff, d)).toFixed(3) + "px"
      );
      el.style.setProperty(
        "--scale-active",
        i === activeIdx ? String(scale) : "1"
      );
    });
  }

  items.forEach((el, i) => {
    el.addEventListener("mouseenter", () => setShifts(i, "in"));
    /* Keyboard users get the same lift, so focus is as visible as
       hover on an icon-only nav. */
    el.addEventListener("focusin", () => setShifts(i, "in"));
  });
  root.addEventListener("mouseleave", () => setShifts(null, "out"));
  root.addEventListener("focusout", (e) => {
    if (!root.contains((e as FocusEvent).relatedTarget as Node)) {
      setShifts(null, "out");
    }
  });
}

/* ============================================================
   Scroll reveal
   ============================================================ */
function initReveal() {
  const nodes = document.querySelectorAll<HTMLElement>(".reveal");
  if (!nodes.length) return;

  if (mql() || !("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.setAttribute("data-seen", "true"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-seen", "true");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );
  nodes.forEach((n) => io.observe(n));
}

/* ============================================================
   transitions.dev / 18-texts-reveal, on the hero only
   ============================================================ */
function initStagger() {
  document.querySelectorAll<HTMLElement>(".t-stagger").forEach((block) => {
    /* Two frames, not one: a single rAF can land in the same paint
       as the initial style, and the transition never starts. */
    requestAnimationFrame(() =>
      requestAnimationFrame(() => block.classList.add("is-shown"))
    );
  });
}

/* ============================================================
   transitions.dev / 16-tabs-sliding

   Markup contract:
     <div class="t-tabs" data-tabs>
       <span class="t-tabs-pill" data-immediate></span>
       <button data-tab="all" aria-selected="true">...</button>
     </div>
   Filtering is delegated: the group emits `tabchange` and the page
   decides what that means.
   ============================================================ */
function initTabs() {
  document.querySelectorAll<HTMLElement>("[data-tabs]").forEach((group) => {
    const pill = group.querySelector<HTMLElement>(".t-tabs-pill");
    const tabs = Array.from(group.querySelectorAll<HTMLElement>("[data-tab]"));
    if (!pill || !tabs.length) return;

    const move = (el: HTMLElement, immediate = false) => {
      if (immediate) pill.setAttribute("data-immediate", "");
      pill.style.setProperty("--pill-x", `${el.offsetLeft}px`);
      pill.style.setProperty("--pill-w", `${el.offsetWidth}px`);
      if (immediate) {
        /* Reflow, then restore the transition, or the next move
           inherits `transition: none`. */
        void pill.offsetWidth;
        pill.removeAttribute("data-immediate");
      }
    };

    const select = (el: HTMLElement, immediate = false) => {
      tabs.forEach((t) => {
        const on = t === el;
        t.setAttribute("aria-selected", String(on));
        t.classList.toggle("text-ink", on);
        t.classList.toggle("text-ink-3", !on);
      });
      move(el, immediate);
      group.dispatchEvent(
        new CustomEvent("tabchange", { detail: { value: el.dataset.tab } })
      );
    };

    tabs.forEach((t) => t.addEventListener("click", () => select(t)));

    const initial =
      tabs.find((t) => t.getAttribute("aria-selected") === "true") ?? tabs[0];
    /* First paint writes position with no transition, or the pill
       animates in from translateX(0) / width 0. */
    move(initial, true);

    let raf = 0;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const current =
          tabs.find((t) => t.getAttribute("aria-selected") === "true") ??
          tabs[0];
        move(current, true);
      });
    });
  });
}

/* ============================================================
   Command palette

   A <dialog> rather than a hand-rolled overlay: focus trapping,
   Escape, and the top layer come from the platform. The list is
   built from the DOM's own nav links plus the page's row titles,
   so it can never list a route that does not exist.
   ============================================================ */
function initPalette() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-palette]");
  if (!dialog) return;
  const input = dialog.querySelector<HTMLInputElement>("[data-palette-input]");
  const list = dialog.querySelector<HTMLElement>("[data-palette-list]");
  const empty = dialog.querySelector<HTMLElement>("[data-palette-empty]");
  if (!input || !list) return;

  const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-palette-item]"));
  let active = 0;

  const visible = () => rows.filter((r) => !r.hidden);

  const paint = () => {
    const vis = visible();
    if (active >= vis.length) active = Math.max(0, vis.length - 1);
    rows.forEach((r) => r.removeAttribute("data-active"));
    vis[active]?.setAttribute("data-active", "");
    vis[active]?.scrollIntoView({ block: "nearest" });
    if (empty) empty.hidden = vis.length > 0;
  };

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    rows.forEach((r) => {
      const hay = (r.dataset.paletteItem || "").toLowerCase();
      r.hidden = q.length > 0 && !hay.includes(q);
    });
    active = 0;
    paint();
  };

  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    input.value = "";
    filter();
    input.focus();
  };

  document
    .querySelectorAll<HTMLElement>("[data-palette-open]")
    .forEach((b) => b.addEventListener("click", open));

  input.addEventListener("input", filter);

  dialog.addEventListener("keydown", (e) => {
    const vis = visible();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(active + 1, vis.length - 1);
      paint();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      paint();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const link = vis[active]?.querySelector<HTMLAnchorElement>("a");
      if (link) window.location.assign(link.href);
    }
  });

  /* Clicking the backdrop closes. A dialog's ::backdrop is not a
     child, so the target being the dialog itself is the signal. */
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  document.addEventListener("keydown", (e) => {
    const isK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
    if (isK) {
      e.preventDefault();
      dialog.open ? dialog.close() : open();
      return;
    }
    if (!isTyping(e) && e.key === "/" && !dialog.open) {
      e.preventDefault();
      open();
    }
  });
}

/* ============================================================
   Number-key navigation

   The dock tooltips advertise 1 to 5 and D, so the shortcuts have
   to exist. A tooltip that names a key that does nothing is worse
   than no tooltip.
   ============================================================ */
function initShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key >= "1" && e.key <= "9") {
      const target = document.querySelector<HTMLAnchorElement>(
        `[data-dock-key="${e.key}"]`
      );
      if (target) {
        e.preventDefault();
        window.location.assign(target.href);
      }
      return;
    }

    if (e.key.toLowerCase() === "d") {
      const dl = document.querySelector<HTMLAnchorElement>("a[download]");
      if (dl) {
        e.preventDefault();
        dl.click();
      }
    }
  });
}

/* ============================================================
   Fanned poster strip

   The strip sits at rest as an overlapped fan and spreads on
   hover. Done in JS rather than CSS because each card's resting
   rotation and offset depend on its index, and the spread has to
   push siblings away from the hovered card in both directions.
   ============================================================ */
function initFan() {
  document.querySelectorAll<HTMLElement>("[data-fan]").forEach((fan) => {
    const cards = Array.from(fan.querySelectorAll<HTMLElement>("[data-fan-card]"));
    if (!cards.length) return;

    const reset = () =>
      cards.forEach((c) => c.style.setProperty("--fan-push", "0px"));

    cards.forEach((card, i) => {
      card.addEventListener("mouseenter", () => {
        if (mql()) return;
        cards.forEach((other, j) => {
          const d = j - i;
          const push = d === 0 ? 0 : Math.sign(d) * (26 - Math.min(Math.abs(d), 3) * 4);
          other.style.setProperty("--fan-push", `${push}px`);
        });
      });
    });

    fan.addEventListener("mouseleave", reset);
    reset();
  });
}

/* ============================================================
   Local dev tools

   Under `astro dev` only, load whatever sits at /_dev/tools.js.
   That path is git-excluded (.git/info/exclude), so each machine
   decides for itself what runs there; a machine with no such file
   gets a silently caught import and nothing else. The whole branch
   is compiled out of production builds: import.meta.env.DEV is a
   build-time constant, so no code, no request and no reference to
   /_dev/ ever ships.
   ============================================================ */
function initDevTools() {
  if (import.meta.env.DEV) {
    /* A <script src> element, not import(): Vite refuses module-graph
       imports of public-dir files even behind @vite-ignore, and its
       error message names this as the sanctioned path. The script tag
       is fetched by the browser outside the module graph, so the file
       is served raw, and its own imports resolve natively. A machine
       without the file gets one 404 in the dev network log and the
       element removes itself. */
    const s = document.createElement("script");
    s.type = "module";
    s.src = "/_dev/tools.js";
    s.onerror = () => s.remove();
    document.head.appendChild(s);
  }
}

/* ============================================================ */
export function initSite() {
  initDevTools();
  initTheme();
  initMode();
  initCopyMachine();
  initClock();
  initTimezoneDelta();
  initCopy();
  initDockHover();
  initReveal();
  initStagger();
  initTabs();
  initPalette();
  initShortcuts();
  initFan();
}
