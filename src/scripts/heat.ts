/**
 * The contribution grid's hover behaviour, shared by the shipped figure
 * and the local grid lab (untracked, see .gitignore).
 *
 * ONE COPY, BECAUSE TWO WOULD DISAGREE. The lab exists to judge this
 * figure. A lab holding its own implementation of the interaction is a
 * lab that can silently drift from the thing it is judging, which is
 * the same reason the year itself lives in lib/heat.ts.
 *
 * EVERYTHING THAT MOVES IS STILL CSS. This records only state the
 * stylesheet cannot derive cheaply on its own:
 *
 *   data-live  on the figure, plus the readout spans: the caption swap
 *   .is-x      on cells: the hovered cell's row and column
 *   data-iso   on the figure: which legend level is isolated
 *
 * The reason it is a script rather than `:has()` is measured, not taste.
 * Deriving the isolate in CSS meant ten `:has()` rules re-matching
 * `:not([data-lv=n])` against 364 cells on every pointer move: 73.55ms
 * of style recalculation per move, against 2.01ms for the version
 * without it. An attribute set from a listener on five swatches changes
 * a handful of times per session, and the rules that read it are plain
 * attribute matches.
 */

export function initHeatFigure(fig: HTMLElement): void {
  const grid = fig.querySelector<HTMLElement>(".heat");
  if (!grid) return;

  const legend = fig.querySelector<HTMLElement>("[data-heat-legend]");
  const liveN = fig.querySelector<HTMLElement>("[data-heat-n]");
  const liveUnit = fig.querySelector<HTMLElement>("[data-heat-unit]");
  const liveWhen = fig.querySelector<HTMLElement>("[data-heat-when]");

  /*
   * Index the cells by week and by weekday once. The crosshair is then
   * two Map lookups per cell entered rather than a query across 364
   * nodes, which matters because it runs at every cell boundary.
   */
  const byWeek = new Map<string, HTMLElement[]>();
  const byDay = new Map<string, HTMLElement[]>();
  for (const cell of grid.querySelectorAll<HTMLElement>(".heat-cell")) {
    const w = cell.dataset.w ?? "";
    const d = cell.dataset.d ?? "";
    (byWeek.get(w) ?? byWeek.set(w, []).get(w)!).push(cell);
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(cell);
  }

  let marked: HTMLElement[] = [];
  let current: HTMLElement | null = null;

  const clearCross = () => {
    for (const c of marked) c.classList.remove("is-x");
    marked = [];
  };

  /*
   * pointerover, not pointerenter. Enter does not bubble, so delegating
   * to 364 children needs the one that does, and one listener on the
   * grid beats 364 on the cells.
   */
  grid.addEventListener("pointerover", (e) => {
    const target = e.target as HTMLElement | null;
    const cell = target?.closest<HTMLElement>(".heat-cell");
    if (!cell || cell === current) return;
    current = cell;

    /* The crosshair: this cell's week and weekday. The cell is in both
       lists and takes the class harmlessly; its own :hover rule sits
       later in the stylesheet and outranks it on source order. */
    clearCross();
    marked = [
      ...(byWeek.get(cell.dataset.w ?? "") ?? []),
      ...(byDay.get(cell.dataset.d ?? "") ?? []),
    ];
    for (const c of marked) c.classList.add("is-x");

    /* The readout: the caption becomes this day's sentence. Split off
       the cell's own title ("3 contributions on Mon, 4 May 2026")
       rather than duplicating the same strings into data attributes on
       every cell. */
    const t = cell.getAttribute("title") ?? "";
    const at = t.indexOf(" on ");
    if (at > -1 && liveN && liveUnit && liveWhen) {
      const n = t.slice(0, at).split(" ")[0];
      const none = n === "No";
      liveN.textContent = none ? "0" : n;
      liveUnit.textContent = none || n !== "1" ? "contributions" : "contribution";
      liveWhen.textContent = t.slice(at + 4);
      fig.dataset.live = "on";
    }
  });

  grid.addEventListener("pointerleave", () => {
    current = null;
    clearCross();
    delete fig.dataset.live;
  });

  /*
   * The legend isolate. Pointer and keyboard both land on the same
   * attribute, which is what makes the keyboard path identical rather
   * than a second implementation of it.
   */
  if (legend) {
    const iso = (e: Event) => {
      const key = (e.target as HTMLElement | null)?.closest<HTMLElement>(".heat-key");
      if (key?.dataset.key) fig.dataset.iso = key.dataset.key;
    };
    const unIso = () => {
      delete fig.dataset.iso;
    };
    legend.addEventListener("pointerover", iso);
    legend.addEventListener("pointerleave", unIso);
    legend.addEventListener("focusin", iso);
    legend.addEventListener("focusout", unIso);
  }
}

/** Wires every contribution figure on the page. */
export function initHeatFigures(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-heat-figure]").forEach(initHeatFigure);
}
