---
title: "Reasoning you can read is not reasoning you can trust"
description: "A model can write a clear chain of thought that has little to do with the answer it gives. Lanham and colleagues built simple tests for this, and they are the reason I stopped treating visible reasoning as evidence on its own."
date: 2026-11-08
cover: /mock/cover-faithfulness.svg
readingTime: "5 min"
status: live
tags: ["interpretability", "alignment", "chain of thought", "faithfulness", "evaluation"]
---

For a while I treated a model's written reasoning as a window into its thinking. The steps were there, they read well, and they led to the answer. Then I read Lanham and colleagues' 2023 paper on measuring faithfulness in chain-of-thought reasoning, and that habit stopped making sense.

The question they ask is simple to state. Does the written reasoning actually drive the answer, or is it a story written after the answer was already decided? If the story is decorative, reading it tells you about the style of the model, not about its decision.

## How they test it

The paper's tests all change the reasoning and watch what happens to the answer. Three are worth knowing.

In early answering, the model is cut off before it finishes its reasoning, and the answer is taken from the partial trace. If the answer barely changes, the rest of the trace was not doing much work.

In adding mistakes, a wrong step is inserted into an otherwise correct trace. If the model's answer shifts toward the mistake, the reasoning was carrying the decision. If the answer ignores the mistake, the trace was decoration.

Paraphrasing works the same way, with a rewording of the trace in place of an error. The point of all three is the same: a faithful trace should matter to the outcome, and an unfaithful one should not.

## What the results do and do not show

The result I remember is not that models always ignore their reasoning. It is that the answer to "does the reasoning matter?" depends on the task and the model. Some tasks showed clear reliance on the trace, and others showed little. The authors also argue that no single test settles faithfulness. Each one probes a different way the trace could be decorative.

That last point is the one I keep returning to. A single check is not a certificate. It is one angle on a question that needs several.

## Why I care about this for alignment

If a model's stated reasoning is a poor guide to its decision, then oversight built on reading that reasoning inherits the same weakness. A monitor that trusts the trace can be fooled by a trace that is fluent and wrong. The practical response is not to stop reading traces. It is to pair the reading with interventions that test whether the trace is doing the work.

This is also why I find the tests more interesting than the headline. Each one is a small experiment you can run on a model you have access to, and each one turns a question about what a model "thinks" into a question about what changes when you edit its reasoning.

## Sources

- Lanham et al., "Measuring Faithfulness in Chain-of-Thought Reasoning" (2023): [arXiv:2307.13702](https://arxiv.org/abs/2307.13702)
