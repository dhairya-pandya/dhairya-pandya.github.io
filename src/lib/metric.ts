/**
 * Derived reads over Project.metric, shared by the project cards and
 * the playground variations.
 *
 * WHY THIS FILE EXISTS AND WHAT IT REFUSES TO DO:
 *
 * Four of the five variations want to show movement, "was 0.71, now
 * 0.89", because that is the comparison a reviewer is actually making
 * and the shipped design buries it inside a disclosure panel.
 *
 * The obvious implementation is a signed delta: parse both numbers,
 * subtract, render "+0.18" in green. That would be WRONG on this data
 * and the wrongness would be invisible:
 *
 *   - "539 / 3,300" against a baseline of "1,904" is an IMPROVEMENT of
 *     1,365 places, and a naive subtraction renders it as -1365 and
 *     colours it as a regression. Leaderboard rank is lower-is-better
 *     and nothing in the type says so.
 *   - "2.7x throughput" against "FP32 at 1.0x, 0.4pt accuracy cost"
 *     has two numbers in the baseline pointing opposite directions.
 *
 * A correct signed delta needs a `higherIsBetter` field on the metric
 * type. Adding one is a schema change to shipped data, so instead this
 * module renders the pair as FROM -> TO and performs no arithmetic. The
 * movement is visible, the direction is the reader's to judge, and no
 * number on the page is invented.
 *
 * If a variation here gets promoted, add `higherIsBetter: boolean` to
 * Project.metric and this file can compute properly.
 */
import type { Project } from "../data/work";

/**
 * The leading figure of a baseline string, or null.
 *
 * ANCHORED TO THE START on purpose. An unanchored /[\d,.]+/ finds "32"
 * inside "FP32 at 1.0x" and reports the baseline as thirty-two. Two of
 * the six projects have baselines that begin with a word rather than a
 * number, so this returns null often enough that every caller has to
 * handle it, which is the point.
 */
export function leadingFigure(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(/^-?[\d,]+(?:\.\d+)?x?/);
  return m ? m[0] : null;
}

export interface MetricPair {
  /** The measured value, always present. */
  to: string;
  /** The baseline as a bare figure, when the string starts with one. */
  from: string | null;
  /** The full baseline sentence, for when `from` is null. */
  fromText: string | null;
  /** True when the pair can render as a compact FROM -> TO. */
  compact: boolean;
}

export function metricPair(p: Project): MetricPair {
  const from = leadingFigure(p.metric.baseline);
  return {
    to: p.metric.value,
    from,
    fromText: p.metric.baseline,
    compact: from !== null,
  };
}

/**
 * Long metric values break a fixed-width numeric column.
 *
 * "539 / 3,300" is eleven characters and overflows a 7rem column at
 * --text-title; "0.89" is four and looks weak below it. Rather than
 * pick a column width that is wrong for one of them, the size steps
 * down for long strings. Measured at build time, so there is no
 * layout shift and no client measurement.
 *
 * `.numeric` sets white-space: nowrap, which is exactly why this is
 * needed: the value cannot wrap out of trouble.
 */
export const valueSize = (value: string) =>
  value.length > 6 ? "text-body" : "text-title";

/** Sort weight for maturity. Deployed first: it is the strongest claim. */
export const maturityRank: Record<string, number> = {
  deployed: 0,
  shipped: 1,
  prototype: 2,
  archived: 3,
};

/**
 * Months since epoch, for timeline geometry. "2026-03" -> 24315.
 * Absolute origin does not matter; only differences are used.
 */
export function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** Today, in the same units. Ongoing work is measured against this. */
export function nowMonthIndex(): number {
  const d = new Date();
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}
