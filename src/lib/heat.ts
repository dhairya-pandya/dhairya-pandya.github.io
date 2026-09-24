/**
 * The contribution year, generated once and shared.
 *
 * WHY THIS IS A MODULE. The grid renders in two places now: the figure
 * on the home page and a local grid lab (untracked). A lab whose grid
 * is a second copy of the generator is a lab that can quietly disagree
 * with the thing it is supposed to be judging, so both read from here.
 *
 * MOCK DATA, seeded so a rebuild is byte-identical. Shaped like a real
 * student's year rather than uniform noise: quiet in exam weeks, dense
 * in the two project sprints, near-zero on most Sundays.
 *
 * THE DRAW ORDER IS LOAD-BEARING. Three calls to r() per day, always in
 * the same order (hit, level, count), even when an earlier result makes
 * a later one unused. Reordering them or short-circuiting a call
 * reshuffles every subsequent day, which changes the picture on the
 * home page. If you touch this loop, diff the rendered class list.
 */

export interface HeatCell {
  /** 0 to 4. Drives the shade and nothing else. */
  level: number;
  week: number;
  /** 0 = Sunday, matching the grid's first row. */
  day: number;
  count: number;
  /** Preformatted, so a tooltip can never disagree with the caption. */
  when: string;
}

export interface HeatWeek {
  week: number;
  total: number;
}

export interface HeatYear {
  cells: HeatCell[];
  weeks: HeatWeek[];
  /** Busiest single week, for scaling a bar chart. */
  peakWeek: number;
  /** Trailing run of days with at least one contribution. */
  currentStreak: number;
  longestStreak: number;
  busiestDay: { count: number; when: string };
  /** Days with at least one contribution, over days in the range. */
  activeDays: number;
  totalDays: number;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86_400_000;

/* Two sprints and two exam troughs, expressed as week ranges. */
const sprint = (w: number) => (w > 8 && w < 17) || (w > 30 && w < 41);
const exams = (w: number) => (w > 20 && w < 25) || (w > 44 && w < 48);

export function buildHeat(range: string, weeks = 52, seed = 20260827): HeatYear {
  const r = rng(seed);

  /*
   * The grid's start date, parsed out of `range` rather than authored
   * twice, so a cell's tooltip can never disagree with the caption
   * under it.
   */
  const [d0, m0, y0] = range.split(" ")[0].split(".").map(Number);
  const START = Date.UTC(y0, m0 - 1, d0);
  const fmtDay = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const cells: HeatCell[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      let p = 0.42;
      if (sprint(w)) p = 0.86;
      if (exams(w)) p = 0.12;
      if (d === 0) p *= 0.28; // Sundays
      const hit = r() < p;
      const level = !hit ? 0 : 1 + Math.floor(r() * (sprint(w) ? 4 : 3));
      const lv = Math.min(4, level);
      /* A count that is consistent with the level it renders, so the
         tooltip and the shade tell the same story. Derived, not a
         second random draw. */
      const count = lv === 0 ? 0 : [0, 1, 3, 6, 11][lv] + Math.floor(r() * 3);
      cells.push({
        level: lv,
        week: w,
        day: d,
        count,
        when: fmtDay.format(new Date(START + (w * 7 + d) * DAY_MS)),
      });
    }
  }

  /*
   * Derived facts. All of them read off `cells`, so none of them can
   * disagree with the picture: the streak the caption claims is the
   * streak the shades show.
   */
  const byWeek: HeatWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    byWeek.push({
      week: w,
      total: cells
        .filter((c) => c.week === w)
        .reduce((n, c) => n + c.count, 0),
    });
  }

  let longest = 0;
  let run = 0;
  for (const c of cells) {
    run = c.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  let current = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].count === 0) break;
    current++;
  }

  const busiest = cells.reduce((best, c) => (c.count > best.count ? c : best), cells[0]);
  const active = cells.filter((c) => c.count > 0).length;

  return {
    cells,
    weeks: byWeek,
    peakWeek: byWeek.reduce((m, w) => Math.max(m, w.total), 0),
    currentStreak: current,
    longestStreak: longest,
    busiestDay: { count: busiest.count, when: busiest.when },
    activeDays: active,
    totalDays: cells.length,
  };
}

/**
 * Five discrete level classes, not opacity utilities.
 *
 * Painting the shade with `opacity` makes the level and the element's
 * alpha the same property, which is why the reveal animation used to
 * need four extra keyframe overrides to stop the utilities fighting its
 * end state. Explicit background colours per level free `opacity` for
 * the animation and `transform` for the hover.
 */
export const heatLevels = ["heat-l0", "heat-l1", "heat-l2", "heat-l3", "heat-l4"];

/** "3 contributions on Mon 4 May 2026", or the no-contribution form. */
export function heatTitle(c: HeatCell): string {
  const n =
    c.count === 0
      ? "No contributions"
      : c.count === 1
        ? "1 contribution"
        : `${c.count} contributions`;
  return `${n} on ${c.when}`;
}
