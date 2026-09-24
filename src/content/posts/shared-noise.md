---
title: "Shared noise looks exactly like a real connection"
description: "The two most correlated positions in the dataset turned out to be the two most boring ones. They weren't talking to each other. They were just both loud."
date: 2026-08-29
cover: /mock/cover-coevolution.svg
readingTime: "4 min"
status: live
tags: ["feature engineering", "statistics", "intuition", "python", "numpy", "probability"]
---

I was scoring how strongly pairs of positions in a sequence move together, and the two most "coupled" positions in the entire dataset turned out to be two of the most boring ones in it. Neither did anything interesting on its own. They were just both loud.

## Why that happens

A raw correlation, or mutual information, or whatever your favourite pairwise statistic is, goes up when either side has a lot of variance on its own, completely independent of whether the two sides actually talk to each other. A position that jumps around a lot will show some correlation with almost anything, the same way two stocks that are both just volatile will move together on any given week without one causing the other.

So the raw number is measuring two things at once: the real coupling, and how noisy each side is individually. Sort by it and the loudest pairs float to the top, whether or not they mean anything.

## The fix, and why it's obvious in hindsight

For every pair, subtract off what you'd expect from each side's own noise level, averaged over everything else it pairs with. Whatever correlation survives that subtraction is the part the pair is contributing on top of each side just being independently unpredictable.

![A raw ranking of four pairs by correlation, next to the same pairs re-ranked after subtracting each one's background noise level. Two loud pairs fall to the middle; a quiet pair rises to the top.](/mock/diag-coevolution.svg)

Once I did that, the two "top coupled" pairs from before dropped to the middle of the ranking, and a completely different, quieter pair took the top spot: one that barely moved on its own, but moved with its partner almost every time it did.

## The boundary

This only separates real coupling from shared noise when the background noise level is roughly comparable across the dataset. Where one region is inherently noisier for a structural reason, the correction over-corrects there and quietly buries a real signal along with the fake ones. I didn't solve that. I flagged which pairs the correction is least trustworthy for and left the flag in the notebook rather than pretending it wasn't a problem.
