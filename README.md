# Holdout

An evidence-first portfolio for AI and ML engineers. Astro + Tailwind, with an
agent-readable twin of every page.

The name is the thesis: a **holdout** is the data you keep back so the test is
honest. Every project in this template is required to state the baseline it
beat and the conditions under which it fails, because a metric without those
is decoration.

> **Status: early. Feedback wanted.**
> All content is placeholder. Nothing in here is a claim about anyone.

---

## Run it

You need [pnpm](https://pnpm.io). This repo pins it via `packageManager` in
`package.json`, so pick whichever install you prefer:

```bash
corepack enable pnpm          # uses the pinned version; needs an admin shell on Windows
npm i -g pnpm@10.22.0         # user-scoped, no admin
```

Then:

```bash
pnpm install
pnpm dev            # http://127.0.0.1:4321
```

That is the whole setup. No env vars, no database, no accounts needed to see
the site.

In a normal terminal `pnpm dev` runs in the foreground with live logs, and
Ctrl+C stops it. Nothing else to know.

**Inside an AI coding agent it behaves differently.** Astro 7 detects an agent
environment and forces the dev server into the background, so the command
returns to the prompt immediately with no live log. An instant prompt there
does not mean it failed to start:

```bash
pnpm exec astro dev status    # is it up, and on what pid
pnpm exec astro dev logs      # the output you would have seen inline
pnpm exec astro dev stop      # shut it down
```

Two consequences worth knowing, both of which cost real time to work out:

- Anything that runs `astro dev stop` kills the shared background server, and
  the next page load then looks like the site is broken.
- After editing `astro.config.mjs`, the first start re-optimizes Vite's
  dependency cache. That can exceed the background server's 30 second
  readiness window and report `Dev server failed to start within 30s`. It is a
  timeout, not a failure. Run it again and it comes up.

To run the contact backend too (Cloudflare Worker + local D1 on disk):

```bash
pnpm dev:backend    # builds, then serves on http://localhost:8787
```

Other scripts:

| Command | What it does |
|---|---|
| `pnpm build` | Generates assets and the resume PDF, then builds to `dist/` |
| `pnpm check` | `astro check`. Should be 0 errors |
| `pnpm gen` | Regenerates the mock posters and `public/resume.pdf` |
| `pnpm deploy` | Builds and `wrangler deploy` |

## Change these three, in this order

1. **`src/config/site.ts`** — name, role, email, availability, education,
   skills, links. Anything reading `Example University` or `+1 555 0100` is a
   placeholder waiting for you.
2. **`src/data/work.ts`** — the projects and the work history. Note the
   `metric` shape: `value`, `label`, `context`, `baseline`. The baseline is
   not optional by accident.
3. **`src/content/posts/` and `src/content/lab/`** — Markdown. Frontmatter is
   validated by Zod schemas in `src/content.config.ts`, so a malformed post
   fails the build instead of rendering wrong.

Then `public/avatar.jpg` for the portrait, and `astro.config.mjs` +
`wrangler.jsonc` for your domain.

## What is unusual about it

**The MACHINE view.** Every page has an agent-readable twin behind the
`[ ] HUMAN  [x] MACHINE` switch in the header: the same facts as markdown,
generated from the same objects the page renders, so the two cannot disagree.
Plus `/llms.txt`, `/llms-full.txt`, `/robots.txt` and `/sitemap.xml`, all
generated from the same data. If you are building for an audience that
increasingly arrives via a model rather than a browser, this is the point.

**Schemas that make the honest thing easy.** A metric carries its context and
its baseline or it does not compile. A project with nothing public to open
renders that gap as a visible, named state rather than quietly omitting it.
Draft posts show their real stage in a queue instead of promising "coming
soon".

**One type size.** All content is set at 16px. Hierarchy comes from weight,
colour and position, which are free, rather than from size, which costs a
scale step every time. Four sizes exist in total: body, a mono micro-label,
section titles, and one display size for the `h1`.

**No shadows anywhere.** Elevation is a surface change plus a hairline. The
content column's edges are drawn as rules that bleed to the viewport, so the
page reads as a measured drawing rather than a stack of cards.

**A real contact backend.** One readable Cloudflare Worker
(`worker/index.js`, ~150 lines): validate, rate-limit, store in D1, optionally
forward by email. The form POSTs there and falls back to composing a prefilled
email in your own mail client if the server is unreachable, so a send gesture
never dead-ends.

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro 7 (static output, zero framework JS by default) |
| Styling | Tailwind CSS 4, driven by tokens in `src/styles/theme.css` |
| Language | TypeScript, `astro check` clean |
| Type | Geist + Geist Mono, loaded non-blocking |
| Icons | Phosphor via `astro-icon`, inlined SVG |
| Interaction | Vanilla TS, CSS-first motion. No React |
| Backend | Cloudflare Worker + D1 |
| Hosting | Cloudflare Workers |

Motion patterns (tooltip, dock hover falloff, accordion, sliding tabs, card
tilt, error shake) follow [transitions.dev](https://transitions.dev), retuned
to this design's tokens.

## Deploying

```bash
npx wrangler d1 create holdout-contact   # paste the id into wrangler.jsonc
npx wrangler secret put RESEND_API_KEY   # optional: email forwarding
pnpm deploy
```

Without the D1 id the site still deploys and works; only the contact endpoint
needs it. Without `RESEND_API_KEY` messages are stored but not emailed, and
readable with:

```bash
npx wrangler d1 execute holdout-contact --command "SELECT * FROM submissions"
```

## What `vercel.json` is doing

JSON has no comments and Vercel's schema rejects unknown keys, so the
reasoning lives here instead.

**Security headers**, applied to every route. None need a build step or
cost a request; they are off by default only because nobody sets them.

| Header | Why |
|---|---|
| `X-Content-Type-Options: nosniff` | Stops the browser guessing a file is a different type than declared, the vector behind most "uploaded a .txt that executed as JS" bugs |
| `Referrer-Policy: strict-origin-when-cross-origin` | Full referrer within the site, origin only cross-site, nothing when downgrading to http |
| `Permissions-Policy` | This site asks for no camera, microphone or location, so it declines them up front |
| `X-Frame-Options: DENY` | No reason for this site to be framed |
| `Strict-Transport-Security` | Two years, subdomains included. Safe because the site is https-only |

**Cache policy**, which is three different answers because the assets
have three different lifetimes:

- `/_astro/*` is fingerprinted by Astro, so those URLs can never go
  stale: one year, `immutable`.
- `/mock/*` is generated but not fingerprinted, so it revalidates
  rather than being immutable: a day in the browser, a week at the edge.
- The agent routes and the PDF change whenever content does: always
  revalidate, but serve instantly from the edge while doing it via
  `stale-while-revalidate`.

## Analytics

Vercel Analytics and Speed Insights, in `src/components/ui/Analytics.astro`.
No cookies, so no consent banner, and Speed Insights reports Core Web
Vitals from real visitors rather than a lab score. Dev is excluded via a
build-time constant, so local page loads never reach the beacon.

Both are Vercel-specific: the beacon posts to `/_vercel/insights`, so on
any other host they load and quietly do nothing. Deploying to Cloudflare
instead means swapping them for the Cloudflare Web Analytics snippet.

## Layouts studied

The structure owes a real debt to five portfolios I studied while building
this: **Chánh Đại**, **Taseen Tanvir**, **Saad Basheer**, **Lorenzo de
Lijser**, and **Making Software**. The column-with-bleeding-rules grid, the
mono micro-label system and the expand-in-place row all come from studying
their work. The treatment here diverged into its own thing (light ground, one
type size, the machine view, the contact page), but the debt is worth naming.

## Licence

MIT. The generated mock imagery in `public/mock/` is produced by
`scripts/gen-mock.mjs` and is yours to keep or delete.
