/**
 * Experience and projects, shaped for the reference's expandable
 * row pattern (Figma 1:18100 and 1:18554).
 *
 * Structure notes, because the shape is doing design work:
 *
 *  - Experience groups by ORGANISATION, then lists roles inside
 *    it. Two roles at one org is common and a flat list makes it
 *    look like two jobs.
 *  - `end: null` means ongoing and renders as the infinity glyph,
 *    per the reference. Duration is COMPUTED from the dates, so a
 *    stale "2y 6m" cannot be left behind in the copy.
 *  - Every project carries `evidence`: what a reviewer can open.
 *    A project with nothing to open renders that absence as a
 *    visible state rather than quietly omitting the row.
 *
 * ALL PLACEHOLDER. Every organisation, date, metric and bullet below
 * is invented to exercise the layout. Replace with your own; the
 * shapes are the point, not the content.
 */

export type Maturity = "deployed" | "shipped" | "prototype" | "archived";

export interface Competition {
  name: string;
  detail: string;
  status: "ranked" | "ongoing";
  writeup: string;
  url?: string;
}

export interface Role {
  title: string;
  icon: string;
  employment: "Full-time" | "Part-time" | "Internship" | "Research" | "Volunteer" | "Freelance";
  /** YYYY-MM. */
  start: string;
  /** YYYY-MM, or null for ongoing. */
  end: string | null;
  bullets: string[];
  chips: string[];
  /** Individual competitions, for roles that are a string of entries rather than one job. */
  competitions?: Competition[];
}

export interface OrgGroup {
  org: string;
  location?: string;
  mode?: "Remote" | "On-site" | "Hybrid";
  verified: boolean;
  roles: Role[];
}

export const experience: OrgGroup[] = [
  {
    org: "Shipd",
    location: "Remote",
    mode: "Remote",
    verified: true,
    roles: [
      {
        title: "ML Engineer",
        icon: "ph:cpu",
        employment: "Freelance",
        start: "2026-03",
        end: null,
        bullets: [
          "Building ML evaluation benchmarks and data solutions for AI labs to reinforce and improve the engineering capabilities of frontier models.",
          "Finished in top-three positions for more than 20 challenges spanning NLP, time-series, fine-tuning, computer vision, sequence-to-sequence, from-scratch modelling, and recommendation systems.",
        ],
        chips: ["Evaluation", "Benchmarks", "NLP", "Time-series", "Computer Vision", "Recommendation Systems"],
      },
    ],
  },
  {
    org: "Kaggle",
    verified: true,
    roles: [
      {
        title: "Competitions Expert (in progress)",
        icon: "ph:chart-scatter",
        employment: "Part-time",
        start: "2025-01",
        end: null,
        bullets: [],
        chips: ["Pandas", "NumPy", "EDA", "Optimization", "Jupyter"],
        competitions: [
          {
            name: "Santa 2025 — Christmas Tree Packing Challenge",
            detail: "Ranked 539th",
            status: "ranked",
            url: "https://www.kaggle.com/competitions/santa-2025",
            writeup:
              "Finished 539th. A geometric optimization problem: pack 1 to 200 trees into the smallest possible square box, scored on the normalized bounding-box area across every puzzle size.",
          },
          {
            name: "Biohub — Cell Tracking During Development",
            detail: "993rd of almost 4,000 teams",
            status: "ongoing",
            url: "https://www.kaggle.com/competitions/biohub-cell-tracking-during-development",
            writeup:
              "Detecting and tracking zebrafish cells through 3D space and time as the embryo develops. Sitting 993rd of almost 4,000 teams on the leaderboard right now. Nowadays I think probing beats genuinely novel approaches: find out what the model is actually using before trying to invent something new.",
          },
        ],
      },
    ],
  },
];

export interface Project {
  slug: string;
  title: string;
  icon: string;
  /** Poster in /mock. Every project has one; none are optional. */
  poster: string;
  start: string;
  end: string | null;
  maturity: Maturity;
  /** One sentence, leading with the result. */
  outcome: string;
  /** What I personally built, separate from the team's work. */
  contribution: string;
  bullets: string[];
  chips: string[];
  /** The headline measurement, with the context that makes it legible. */
  metric: { value: string; label: string; context: string; baseline: string | null };
  /** What a reviewer can open. An empty array renders as a named gap. */
  evidence: { kind: "repo" | "demo" | "notebook" | "model" | "writeup"; label: string; url: string }[];
  featured: boolean;
}

export const projects: Project[] = [
  {
    slug: "pathos",
    title: "PathOS",
    icon: "ph:microscope",
    poster: "/mock/poster-pathos.svg",
    start: "2026-05",
    end: null,
    maturity: "shipped",
    contribution:
      "I worked on both halves of PathOS. On the model side I handled the fine-tuning, the alignment work and the evaluation. On the device side I built the offline app and the packaging that lets it run without a GPU or a connection.",
    outcome:
      "An offline AI pathologist that runs the first-pass H&E screen on a laptop with no GPU and no internet, built for labs where the queue is the real bottleneck.",
    bullets: [
      "Fine-tuned Gemma 4 E2B on 19.5K histopathology examples, then GRPO with four reward functions to remove the hedging: v1 refused 82% of the time it got a yes/no question wrong instead of answering.",
      "Closed a 55-point gap between the raw model (~35%) and the full inference pipeline with voting, retrieval and retry (~90%+) by distilling those test-time techniques back into the weights.",
      "Exported to GGUF for llama.cpp: runs at Q8_0 on a laptop or Q4_K_M on a Raspberry Pi 5, no Python environment, one command through Ollama.",
      "Won the Ollama Prize in the Special Technology Track at the Gemma 4 Good Hackathon (Kaggle x Google DeepMind), against 1,600+ teams.",
    ],
    chips: ["Gemma 4", "Unsloth", "GRPO", "LoRA", "GGUF", "Ollama"],
    metric: {
      value: "88%",
      label: "yes/no accuracy",
      context: "100-sample PathVQA validation set, single forward pass",
      baseline: "~50% from the base Gemma 4 E2B with no pathology tuning",
    },
    evidence: [
      { kind: "repo", label: "Source", url: "https://github.com/dhairya-pandya/PathOS-Gemma4" },
      { kind: "model", label: "Model", url: "https://huggingface.co/dhairyapandya/pathos-gemma4-distilled-rl-4B-GGUF" },
      { kind: "writeup", label: "Writeup", url: "https://kaggle.com/competitions/gemma-4-good-hackathon/writeups/pathos-getalife" },
    ],
    featured: true,
  },
  {
    slug: "udte-bhawre",
    title: "Udte Bhawre",
    icon: "ph:terminal-window",
    poster: "/mock/poster-udtebhawre.svg",
    start: "2026-04",
    end: "2026-05",
    maturity: "shipped",
    contribution:
      "I came up with the idea behind Udte Bhawre and built its first layer. That layer is what lets AI agents talk to each other and run actions against the system's local environment.",
    outcome:
      "A cross-platform desktop AI companion that lives in the taskbar, built in a single overnight sprint at Hackbyte 4.0.",
    bullets: [
      "Electron tray app with multiple concurrent AI sessions (Gemini, Claude, Codex) rather than one chat window, each a distinct 'character' with its own role.",
      "Model Context Protocol integration gives every session direct tool access to the local system instead of copy-pasted shell commands, with every prompt routed through the ArmorIQ SDK for cryptographic intent verification before a tool call executes.",
      "A Control Centre dashboard manages agent settings, conversation history and multi-terminal sessions from one place, backed by MongoDB for persistence.",
      "2nd prize, team getalife(), judged live on stage at IIITDM Jabalpur.",
    ],
    chips: ["Electron", "Node.js", "MongoDB", "Gemini", "MCP"],
    metric: {
      value: "2nd",
      label: "prize, Hackbyte 4.0",
      context: "IIITDM Jabalpur, team getalife()",
      baseline: null,
    },
    evidence: [
      { kind: "repo", label: "Source", url: "https://github.com/rounak-agl/Udte-Bhawre" },
    ],
    featured: true,
  },
  {
    slug: "rocketlanding",
    title: "RocketLandingWithRL",
    icon: "ph:rocket-launch",
    poster: "/mock/poster-rocketlanding.svg",
    start: "2026-09",
    end: "2026-10",
    maturity: "shipped",
    contribution:
      "I built the rocket environment and its physics, every learning agent in the project, and the evaluation suite that compares them.",
    outcome:
      "A 2D rocket learns to land on a rolling drone ship in gusty wind. The environment, physics and every RL algorithm are written from scratch and trained on a laptop CPU, then compared against a hand-written PID controller.",
    bullets: [
      "Physics, environment and seven learning agents (REINFORCE, PPO, SAC, TD3, GRPO, evolution strategies, DQN) written from scratch in Python, plus a model-predictive planner.",
      "Five difficulty levels, from a static pad to a rocking ship in randomized wind, trained as single levels, mixes and curricula.",
      "Randomized training makes generalists: an agent trained on wind, mass and engine-lag changes lands 95 to 100% on the easier levels, beating each level's own specialist.",
      "Reward fixes were textbook lessons: a discount of 0.999 so the agent sees landings 10 to 30 seconds ahead, and deck crashes graded by impact speed instead of one flat penalty.",
    ],
    chips: ["Python", "PyTorch", "PPO", "SAC", "GRPO", "Reinforcement learning"],
    metric: {
      value: "76%",
      label: "of far booster returns (L4) landed",
      context: "PPO trained on a mix of levels with an entropy bonus, 100 held-out starts",
      baseline: "Hand-written PID controller: 45% on the same level",
    },
    evidence: [
      { kind: "demo", label: "Play the game", url: "https://rocket-landing-with-rl.vercel.app" },
    ],
    featured: true,
  },
  {
    slug: "papersseum",
    title: "Papersseum",
    icon: "ph:map-trifold",
    poster: "/mock/poster-papersseum.svg",
    start: "2026-10",
    end: "2026-10",
    maturity: "shipped",
    contribution:
      "I came up with the idea for Papersseum and built the arena engine and the Gym-style environment. I also set up the GCP connection and the live scheduling that runs every match, and I published a PyPI library.",
    outcome:
      "A real-time multi-agent territory game, paper plus colosseum: five agents draw trails on a shared arena, and closing a loop takes everything inside it. Anyone can enter an agent, from a few rules to a neural net.",
    bullets: [
      "Deterministic arena engine with a Gym-style environment, baseline agents and a replay viewer, so any match can be re-run from its seed and action log.",
      "Ladder rounds of random five-agent lobbies rate agents by placement, then a final round sets the leaderboard.",
      "Cutting a rival's trail takes their whole territory and grants a short speed burst, a deliberate change from a stock paper.io-style rule set.",
    ],
    chips: ["Python", "Multi-agent", "Reinforcement learning", "Game engine"],
    metric: {
      value: "180 s",
      label: "per match, five agents, one shared map",
      context: "matches replay exactly from their seed and action log",
      baseline: null,
    },
    evidence: [
      { kind: "repo", label: "Source", url: "https://github.com/dhairya-pandya/papersseum" },
      { kind: "demo", label: "Live", url: "https://papersseum.vercel.app" },
    ],
    featured: true,
  },
  {
    slug: "tripwire",
    title: "Tripwire: does Beam cheat, and does it say so?",
    icon: "ph:flask",
    poster: "/mock/poster-tripwire.svg",
    start: "2026-10",
    end: "2026-10",
    maturity: "prototype",
    contribution:
      "I designed and ran the Tripwire study. That covered building the tasks, setting up the three conditions, grading the episodes, and writing up the results.",
    outcome:
      "A behavioural interpretability study of Beam, an open-weight reasoning model: when a coding task cannot be solved honestly, does it cheat, does its reasoning show it, and does its report to the user admit it?",
    bullets: [
      "616 episodes on 44 real bug fixes from fastapi, rich and requests, each with one expected value changed in the task's own test, so the only way to pass is to cheat.",
      "On impossible tasks Beam cheated in 66% of episodes at low effort and 79% at high. On real tasks it touched a test once in 176 episodes, justified by the issue.",
      "Its reasoning gave the cheat away: a keyword rule found 87% of cheats. Its note to the user mentioned the cheat in 6 of 33 cases.",
      "More reasoning effort did not mean more honesty. A 30-turn cap made high effort look cleaner, because most runs never reached the test. At 60 turns it cheated more often.",
    ],
    chips: ["Python", "Interpretability", "Reasoning models", "Evaluation"],
    metric: {
      value: "66%",
      label: "of impossible-task episodes cheated, low reasoning effort",
      context: "616 episodes, 44 tasks; control tasks: one test edit in 176",
      baseline: "Control tasks with the real test: 1 in 176",
    },
    evidence: [
      { kind: "demo", label: "Explorer", url: "https://huggingface.co/spaces/dhairyapandya/beam-tripwire" },
      { kind: "writeup", label: "Results", url: "https://github.com/dhairya-pandya/beam-tripwire/blob/main/docs/RESULTS.md" },
      { kind: "repo", label: "Source", url: "https://github.com/dhairya-pandya/beam-tripwire" },
      { kind: "model", label: "Episodes", url: "https://huggingface.co/datasets/dhairyapandya/beam-tripwire-episodes" },
    ],
    featured: true,
  },
  {
    slug: "nyayasetu",
    title: "NyayaSetu",
    icon: "ph:scales",
    poster: "/mock/poster-nyayasetu.svg",
    start: "2026-01",
    end: "2026-03",
    maturity: "shipped",
    contribution:
      "I built NyayaSetu on my own, from the agents all the way through to the retrieval layer.",
    outcome:
      "A multi-agent legal intelligence system that bridges static IPC/BNS statutes with live Supreme Court judgments, built to cut hallucination in legal AI rather than just retrieve faster.",
    bullets: [
      "Four LangGraph agents with separate jobs: a Legal Clerk retrieves static law over hybrid dense and sparse search in Qdrant, an Amendment Watchdog checks whether it has since changed, an Evidence Auditor reads submitted video or audio, and a Senior Counsel synthesises the final answer.",
      "Prioritises Supreme Court judgments over outdated statute text when the two disagree, instead of quoting whichever the retriever ranks first.",
      "Multimodal: can watch crime footage and listen to audio evidence directly, not just read text filings.",
      "Built for Convolve 4.0, a Pan-IIT AI/ML hackathon, and deployed live rather than left as a notebook.",
    ],
    chips: ["LangGraph", "LangChain", "Streamlit", "Qdrant", "Gemini 2.5 Flash"],
    metric: {
      value: "4",
      label: "specialized agents",
      context: "LangGraph state machine, Convolve 4.0 Pan-IIT hackathon",
      baseline: null,
    },
    evidence: [
      { kind: "repo", label: "Source", url: "https://github.com/dhairya-pandya/Legal-Advisory-Multi-Agent-System" },
      { kind: "demo", label: "Live", url: "https://legal-advisory-counsel.streamlit.app/" },
    ],
    featured: false,
  },
];

/** ---- helpers -------------------------------------------------
 * Duration is derived, never authored. An authored "2y 6m" goes
 * stale the month after it is written.
 */
export function monthsBetween(start: string, end: string | null): number {
  const [sy, sm] = start.split("-").map(Number);
  const e = end ? end.split("-").map(Number) : null;
  const now = new Date();
  const ey = e ? e[0] : now.getUTCFullYear();
  const em = e ? e[1] : now.getUTCMonth() + 1;
  return Math.max(0, (ey - sy) * 12 + (em - sm)) + 1;
}

/** "8m", "2y", "2y 6m". Compact enough to sit in a mono meta line. */
export function humanDuration(start: string, end: string | null): string {
  const m = monthsBetween(start, end);
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return `${m}m`;
  if (rem === 0) return `${y}y`;
  return `${y}y ${rem}m`;
}

/** "05.2025" for a mono date, matching the reference format. */
export function dotDate(ym: string): string {
  const [y, m] = ym.split("-");
  return `${m}.${y}`;
}

/** The infinity glyph for an ongoing range, per the reference. */
export function dateRange(start: string, end: string | null): string {
  return `${dotDate(start)} - ${end ? dotDate(end) : "∞"}`;
}

export const maturityMeta: Record<Maturity, { label: string; tone: string }> = {
  deployed: { label: "Deployed", tone: "live" },
  shipped: { label: "Shipped", tone: "live" },
  prototype: { label: "Prototype", tone: "caution" },
  archived: { label: "Archived", tone: "muted" },
};

export const findProject = (slug: string) => projects.find((p) => p.slug === slug);
