---
title: "Refusal looked like one direction, until the reasoning joined in"
description: "A single direction in the residual stream was enough to switch refusal off in open models. Newer work shows that reasoning models make the picture messier, and that is the part I want to understand."
date: 2026-11-05
cover: /mock/cover-refusal-direction.svg
readingTime: "5 min"
status: live
tags: ["interpretability", "alignment", "refusal", "steering", "open models"]
---

When I started reading about open-weight safety, the result that stuck with me was small enough to fit on one line. In a 2024 paper, Arditi and colleagues found that refusal in many chat models could be controlled by one direction in the residual stream. They took the average difference between activations on harmful and harmless prompts, and removing that direction from the model made it answer requests it had been trained to refuse. The method is now widely called abliteration, and it is the reason "abliterated" models exist at all.

I find the result unsettling and useful in equal measure. Unsettling, because a behaviour that took a whole training process to install can be removed by a single rank-one edit. Useful, because it shows how interpretability can find the handle a behaviour hangs from.

## What the direction is, and is not

The direction is found, not designed. You run the model on prompts it refuses and prompts it answers, collect the activations at the token where the decision is made, and take the difference of their means. The paper's claim is that this vector carries most of the signal the model uses to decide whether to refuse.

Two things are easy to miss. First, a direction found this way is a correlational object. It tells you where the behaviour is readable, not necessarily where it is computed. Second, it depends on the prompts you chose. A direction derived from one set of harmful requests may not transfer to another.

## Where it gets messier

The simple story holds for many non-reasoning models. Reasoning models are harder. A 2026 paper titled roughly "Beyond a Single Direction" argues that chain-of-thought disrupts simple steering of refusal: once the model reasons before it answers, the one-direction edit no longer switches the behaviour off as cleanly. I have not reproduced that result, so I hold it loosely, but it matches a broader lesson. Adding a step between the question and the answer adds places where the decision can be made.

That is the part I want to understand better. If refusal is partly a property of the reasoning trace, then reading the trace is part of reading the refusal.

## Why it matters for alignment

For a safety researcher, the useful question is not "can I remove refusal?" It is "what else moves when I do?" A clean removal would be a clean experiment. A messy one tells you the behaviour is spread across the computation, and that a fix applied at one point can leave the others intact.

I am still working out which of these readings is right for the models I care about. The starting point is the same for each: find a direction, test whether it does what it claims, and then check what it does not claim.

## Sources

- Arditi et al., "Refusal in language models is mediated by a single direction" (2024): [arXiv:2406.11717](https://arxiv.org/abs/2406.11717)
- "Beyond a Single Direction: Chain-of-Thought Disrupts Simple Steering of Refusal" (2026): [arXiv:2605.26772](https://arxiv.org/html/2605.26772)
