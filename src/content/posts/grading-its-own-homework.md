---
title: "The blend weights were grading their own homework"
description: "Fitting an ensemble's weights and scoring them on the same rows produces an honest-looking number that isn't honest. Nothing about the models changed. The belief about them did."
date: 2026-08-28
cover: /mock/cover-stack.svg
readingTime: "4 min"
status: live
tags: ["ensembling", "validation", "intuition", "python", "scikit-learn", "optimization"]
---

Every model in the blend was already cross-validated properly: fit on a training fold, scored on a fold it never saw. Then I took all their out-of-fold predictions, fit a set of blend weights on top of them, and scored the blend on those same out-of-fold predictions. The number looked great. It was lying.

## The mistake, once you see it

Each individual model never saw its own validation fold during training. The blend weights did, twice: once through the predictions themselves, and once through being scored against the true labels for exactly those rows. Nothing was stopping the weights from leaning toward whichever model happened to get lucky on that particular split.

It's the same mistake as tuning a hyperparameter on your test set. It just hides better, because every input to it was already labelled "validation," so it doesn't look like anything is touching data it shouldn't.

## What actually fixes it

Give the blend weights a holdout of their own, separate from the one the base models used. Split the out-of-fold predictions again: fit weights on one inner slice, score them on the other, repeat across a few splits, average the weight vectors that come out.

![Three base models scored honestly, next to the same blend scored on its own fit rows versus scored on a held-out split. The leaky score sits noticeably above the honest one.](/mock/diag-stack-honesty.svg)

On one blend, doing this dropped the reported score by a real amount, entirely because the honest version could no longer credit itself for fitting the exact noise sitting in the rows it was being judged on.

## The part that surprised me

The weights themselves barely moved. It was the score attached to them that changed. That's the part worth remembering: a leaky validation setup doesn't usually corrupt what you built. It corrupts your belief about how good it is, which is arguably worse, because there's nothing visibly broken to go and fix.
