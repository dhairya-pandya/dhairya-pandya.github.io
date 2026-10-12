---
title: "A policy that lands is not the same as a policy you understand"
description: "Learning reinforcement learning by landing a rocket taught me that a success rate hides the question I actually care about: why the agent does what it does, and where it will quietly stop working."
date: 2026-10-13
cover: /mock/cover-interp-rl.svg
readingTime: "5 min"
status: live
tags: ["reinforcement learning", "interpretability", "intuition", "python", "pytorch", "control"]
---

I started reinforcement learning wanting one number: how often does the agent land? A rocket on a rocking ship in gusty wind gave me that number, and it went up. Then I stopped trusting it.

The agent that lands 76% of the hardest returns and the agent that lands it 10% of the time can both be "working" in the sense that the reward curve goes up. What I wanted to know was what each one had learned, and what it would do the moment the wind changed.

## A success rate is a summary, not an explanation

My first PPO agents did not land at all. They learned to hover until the time limit, which is a perfectly reasonable thing to learn if hovering scores better than crashing. Nothing in the success rate told me that. I had to look at the behavior to see it.

The fixes were small and each one was a lesson in what the policy was optimizing. A discount of 0.99 made the agent look only about three seconds ahead, while landings were 10 to 30 seconds away. Raising it to 0.999 changed what the agent could see. A flat crash penalty treated a 3 m/s touchdown the same as a 30 m/s one, so I graded the penalty by impact speed.

![Two reward curves against impact speed. A flat penalty gives the same score to a gentle and a violent touchdown; a graded penalty slopes toward slower landings.](/mock/diag-rl-slope.svg)

Each of those fixes changed the shape of the reward the agent was climbing. The success rate moved, but the reason it moved was the shape.

## Specialists break where generalists don't

The clearest result came from training on randomness. An agent trained on one fixed setting learned that setting. An agent trained with wind, mass and engine lag changing every episode lands 95 to 100% on the easier levels, which is better than the specialist for each of them. It also beats the hand-written controller in wind, which is tuned for nominal physics and struggles once the physics moves.

The uncomfortable part is the hardest level. Mixing levels helped, and adding a small entropy bonus helped more, but the far booster return still fails a quarter of the time. A single number cannot tell me whether those failures are the same kind of failure.

![Success rate per level for three agents: the hand-written PID, a specialist trained only on L3, and a mix-trained PPO.](/mock/poster-rocketlanding.svg)

## What interpretability would ask

This is where I am now. Interpretability, to me, is the habit of asking the policy questions it was never trained to answer. Given a tilt and a horizontal offset, which engine does it fire, and does that choice change smoothly or flip at a boundary I did not design? Where does it hesitate?

Some of that is simple to picture. The cover is a sketch of the picture I am looking for: a ridge where the policy commits, and the places where it should be cautious. It is drawn, not measured.

If the ridge sits in the wrong place for a level the agent never saw, the success rate will not warn me in advance. A map of the decision will.

## The takeaway for me

Reinforcement learning rewards you for the outcome, so the outcome is the first thing you measure. But the outcome is a sample from a policy, and a policy is a function you can probe. I am learning to do the probing as routinely as the scoring, because the cases where a policy fails are the cases where its reasons matter most.
