---
title: "Does safety survive an attack in another language?"
description: "Defences for customer fine-tuning are built and tested almost entirely in English. We fine-tuned a defended model on poisoned Bengali data and found English looked safe while Bengali did not. A low-rank repair brought the Bengali harm down without retraining."
date: 2026-11-15
cover: /mock/poster-lexsi.svg
readingTime: "8 min"
status: live
tags: ["alignment", "fine-tuning attacks", "multilingual safety", "low-rank", "tamper resistance"]
---

Safety defences that model providers apply during customer fine-tuning are usually built and tested in English. We wanted to know what happens when the attacker's poisoned data is written in another language. If a defence holds for English prompts, does it hold for the same harmful requests in Bengali, and does it hold for Bengali at all?

The short answer is no. The longer answer is more useful, because one of the fixes we tried worked well and one did not.

## The setup

We used Tiny Aya Fire, a roughly 3.35 billion parameter model from Cohere Labs, which is trained for South Asian languages including Bengali. We defended it with the usual SafeTune methods: Lisa, Booster, Vaccine and RepNoise. Then we ran a poisoned fine-tune in Bengali, where the training data pairs harmful requests with compliant answers.

After the attack, we evaluated the model in both languages on harmful prompts. The question was simple: how often does it refuse?

## What we found

In English, the defended model refused 96 to 100% of harmful prompts. By that measure, the defence looked fine. In Bengali, the same model answered 59 to 61% of harmful prompts.

An English-only evaluation would have approved a model that is badly unsafe in Bengali. That gap is the first finding and the reason we would not trust a safety report that tested one language.

The second finding was about adding safety data. We tried including Bengali safety examples during the defence. That barely helped: harm moved from 0.57 to 0.46. The attack overwrote most of the safety we added. In our reading, this is a tamper-resistance problem, where the attacker's update can undo the defence, and not a coverage problem where the model had simply not seen enough Bengali.

## What fixes it

The most useful result came from looking at the weights. The change the attack makes to each layer is close to rank one. For each attention and MLP update, the top two singular directions carry about half the energy of the change. We removed the top singular direction of each update, a repair we call project_dw with k equal to 1.

The effect was large. Bengali harm dropped from 50% to 14%. English stayed safe. The model's score on MMLU, a broad knowledge benchmark, was preserved. The repair needed no retraining, so a provider could apply it after a fine-tune is done.

Our reading of why this works is that the harmful part of the update is concentrated in a few directions, while the benign gain from the fine-tune is spread across many. Cutting the concentrated part removes most of the damage and leaves most of the useful learning. This reading is a hypothesis we formed from the weight analysis, not something we proved.

## What did not work

We also tried a training-time version. The idea was to anchor the refusal directions during fine-tuning, so the attack could not move them. It did not work. Anchoring on English data did nothing for Bengali, and anchoring on the union of both languages made the result worse.

So in these experiments, repair after the fine-tune beat prevention during training. We would not generalise that too far. It is one model, one language pair and one attack, and the training-time method might work with a different design. But it is the result we would put first to anyone building a defence.

## What it does not show

A few limits matter. The study covers one model family, one language pair and one attack type, so it does not tell us how far the effect reaches. The repair was tested on a fixed setup, and we have not checked how it behaves under other attacks or on other languages. The harm measure is a refusal rate on a particular set of prompts, which is a proxy for safety and not safety itself.

We also think the most important practical point is about measurement. If you evaluate a defended model in only one language, you may be measuring the wrong thing.

## Sources

- Study repository: [Lexsi-AI-Alignment](https://github.com/dhairya-pandya/Lexsi-AI-Alignment)
- Interactive results: [getalife-lexsi-study.vercel.app](https://getalife-lexsi-study.vercel.app)
- Base model: [CohereLabs/tiny-aya-fire](https://huggingface.co/CohereLabs/tiny-aya-fire)
