---
title: "Platform work for a site with one author: the checks that earn their keep"
description: "A personal site has no ops team, which makes every pipeline step either a habit or dead weight. These are the ones I kept, and why each one failed once before it earned its place."
date: 2026-10-26
cover: /mock/cover-platform.svg
readingTime: "5 min"
status: live
tags: ["ci/cd", "backend", "deployment", "validation", "typescript", "cloudflare"]
---

This site has one author, no staging environment and no on-call rotation. Most of the platform advice I read assumes a team, so I kept only the parts that catch a real mistake when there is nobody else to catch it.

## One path from commit to live

Every change goes through the same five gates, in the same order:

![A pipeline of five boxes: commit, typecheck, generate assets, build, deploy. Each gate must pass before the next runs.](/mock/cover-platform.svg)

1. **Commit to main.** Nothing reaches production from a branch I haven't merged.
2. **Typecheck.** `pnpm check` runs the TypeScript checker over the whole project. It takes seconds and catches a renamed prop before a page breaks.
3. **Generate.** A `prebuild` step regenerates the images and the resume PDF from the same source files the pages read.
4. **Build.** The static site is built. The build fails on any error in the pages.
5. **Deploy.** A Cloudflare Worker serves the built site, or GitHub Pages does, depending on the target.

The useful part is that step three is inside the build, not a separate chore I might forget.

## Let the build check the things a reviewer checks

The resume is written out by hand as a PDF generator, and it repeats facts that live in the site config: my name, my email, the number of projects. Those copies drift. So the generator has a drift check that compares its copy against the source files and fails the build when they disagree.

It only checks three things, and that is deliberate. A check that fails often trains you to ignore it. Each time the project count changed, the build failed until I updated the mirror, which is the behaviour I wanted.

## Keep secrets out of the repo

The contact form stores messages in a D1 database and can forward them by email. The forwarding key is set with `wrangler secret put`, never written into the config. The config holds the database id and the recipient address, which are not secrets. I learned this line the easy way: a placeholder address from a template sat in the config for a while before I noticed it.

## Decide early which features need a server

The contact form posts to a Worker endpoint. The same site on GitHub Pages has no endpoint, so the form cannot work there. The choice of host is a feature decision, and it is cheaper to make it at the start than to find the form broken after a deploy.

## Set the headers once, and match cache lifetimes to the asset

Security headers live in one config file: `nosniff`, a strict referrer policy, a permissions policy that asks for nothing, frame denial and HSTS. They cost no build step and no request, so there is little reason to leave them off.

Cache rules follow how often each file changes. Fingerprinted build output can be cached for a year and marked immutable, because its URL changes when its content does. Generated files that keep the same name revalidate instead. A single cache rule for everything would be wrong for at least one of them.

## What I would still do differently

Pages only serves static files. That is the right default for a portfolio, and the contact form is the one place I had to choose between the two. If the site grows a backend, I would put the host decision in the first design note, not in the deployment log.
