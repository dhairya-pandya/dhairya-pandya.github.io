/**
 * Single source of truth for identity.
 *
 * Everything with a name, a number or a date lives here or in a
 * content collection. No component hardcodes a fact, so the resume
 * page and the site cannot drift apart: they read the same objects.
 *
 * EVERYTHING BELOW IS PLACEHOLDER unless you replaced it. Education,
 * certifications, volunteer work, metrics, dates, systems, posts and
 * testimonials are invented to exercise the layout: they are not
 * claims about anyone. Names like "Example University" mark the
 * fields most in need of editing.
 *
 * Start here, then src/data/work.ts, then src/content/.
 */

export const site = {
  name: "Dhairya Pandya",
  /** The phonetic spelling the hero renders next to the name. */
  pronounce: "/DHAI-ryuh PUN-dyuh/",
  role: "AI/ML Engineer",
  /** Completes the sentence "I build ..." */
  builds:
    "machine learning systems end to end, from data pipelines and model training to evaluation and deployment",
  tagline: "Measure it, or it did not happen.",
  availability: "Open to AI/ML internships and research roles for Summer 2027",
  status: "available",
  location: "India",
  timezone: "Asia/Kolkata",
  pronouns: "he/him",
  email: "dhairyapandya.workspace@gmail.com",
  phone: "+91 91739 31925",
  url: "https://dhairyapandya.holdout.workers.dev",
  /** Rendered in the header's left slot, mono uppercase. */
  est: "EST. 2006",
} as const;

/**
 * The identity grid, lifted from the reference's two-column
 * icon + value block. Ordered by what a reviewer checks first:
 * what he does, where he is, how to reach him.
 *
 * `icon` names a Phosphor glyph (ph:<name>).
 *
 * Order matters: the grid flows row-major across two columns, so
 * items are listed in pairs that belong side by side. The two
 * degrees share a row, which is what makes "concurrent" legible
 * without the word appearing anywhere.
 *
 * Values are kept short enough to sit on one line at the column
 * width. Anything longer truncates with a title attribute, which
 * is a fallback rather than a plan.
 */
export const identity = [
  { icon: "ph:code", label: "Role", value: "AI/ML Engineer", href: null },
  { icon: "ph:map-pin", label: "Location", value: "India", href: null },
  { icon: "ph:clock", label: "Local time", value: "__CLOCK__", href: null },
  { icon: "ph:gender-intersex", label: "Pronouns", value: site.pronouns, href: null },
  { icon: "ph:envelope-simple", label: "Email", value: site.email, href: `mailto:${site.email}` },
  { icon: "ph:phone", label: "Phone", value: site.phone, href: `tel:+919173931925` },
] as const;

/** External profiles. `stat` is the thing a reviewer can verify. */
export const profiles = [
  { platform: "GitHub", handle: "dhairya-pandya", url: "https://github.com/dhairya-pandya", stat: "Code for the projects on this site", icon: "ph:github-logo" },
  { platform: "LinkedIn", handle: "dhairya-pandya", url: "https://www.linkedin.com/in/dhairya-pandya/", stat: "Open to internships and research roles", icon: "ph:linkedin-logo" },
] as const;

/**
 * The stack table: numbered rows, mono chips.
 *
 * Grouped by the job each tool does rather than by language, so
 * the row labels answer "can he do X" instead of "what has he
 * heard of". Every entry here is from the resume.
 */
export const stackGroups = [
  { group: "Languages", items: ["Python", "Java", "C++", "C", "SQL"] },
  { group: "ML and data", items: ["scikit-learn", "NumPy", "Pandas", "Matplotlib", "EDA"] },
  { group: "Serving and infra", items: ["PostgreSQL", "Hugging Face", "Docker", "Bash", "Git"] },
  { group: "Applied AI", items: ["Prompt engineering", "Retrieval", "Eval harnesses", "Quantization"] },
  { group: "Modeling", items: ["Fine-tuning", "Time-series", "Computer Vision", "Recommendation systems", "Sequence-to-sequence"] },
  { group: "Foundations", items: ["Linear algebra", "Probability", "Statistics", "Optimization"] },
  { group: "Environment", items: ["VS Code", "Jupyter", "GitHub Desktop", "Excel"] },
] as const;

/** Education. Real, from the resume. Two concurrent degrees. */
export const education: {
  school: string;
  credential: string;
  start: string;
  end: string;
  note: string | null;
  grade: string | null;
}[] = [];

/** Volunteer work. Real, from the resume. */
export const volunteer = [
  {
    org: "HackByte 4.0, IIITDM Jabalpur",
    kind: "Hackathon",
    role: "Volunteer organiser",
    period: "2026",
    detail:
      "Helped organise a hackathon with over 6,000 registrations. Handled public relations and on-ground crowd and resource management.",
  },
] as const;

/**
 * MOCK. Peer notes, for the reference's testimonial block.
 * Invented to exercise the layout; not real endorsements.
 */
export const notes = [
  {
    quote:
      "Dhairya rewrote our feature pipeline and then, unprompted, wrote the test that proves it matches the old one row for row. That is the part nobody does.",
    author: "Team lead",
    role: "Open-source project",
    weight: "primary",
  },
  {
    quote:
      "He turned up to the robotics review with a baseline. Everyone else brought a demo.",
    author: "Faculty mentor",
    role: "Example University",
    weight: "primary",
  },
  { quote: "Reads error bars before headlines.", author: "Study group", role: "Example University", weight: "short" },
  { quote: "Documents the failure modes. Rare.", author: "Project partner", role: "Sentiment analysis", weight: "short" },
  { quote: "Fixed my dataloader in ten minutes.", author: "Classmate", role: "Example University", weight: "short" },
] as const;

/**
 * The footer spec table, lifted from the reference. Mono keys,
 * mono values, hairline cells. It reads as a colophon: what this
 * page is made of, which is the correct register for a portfolio
 * whose whole argument is "I show my work".
 */
export const colophon = {
  domain: "dhairyapandya.holdout.workers.dev",
  blurb: "A portfolio that shows the measurement, not just the result.",
  cells: [
    { key: "Crafted by", value: "@dhairya-pandya", href: "https://github.com/dhairya-pandya" },
    { key: "Build", value: "a1c4f9e", href: null },
    { key: "Date", value: "2026-08-29", href: null },
    { key: "Systems", value: "4 shipped", href: null },
    { key: "Deployed on", value: "Cloudflare", href: null },
    { key: "Source code", value: "GitHub", href: "https://github.com/dhairya-pandya" },
    { key: "License", value: "MIT License", href: "https://opensource.org/license/mit" },
    { key: "Typeface", value: "Geist", href: null },
  ],
  stack: ["astro@7.1.6", "tailwindcss@4.3.3", "motion@12.43.0"],
  analytics: ["Cloudflare Web Analytics"],
  inspiredBy: ["Chánh Đại", "Taseen Tanvir", "Saad Basheer", "Lorenzo de Lijser", "Making Software"],
} as const;

/**
 * Dock entries. Icons with instant tooltips; the active page renders
 * the filled variant of its glyph, which is what marks "you are
 * here" without a second indicator competing with the icon.
 *
 * Resume is deliberately not here: the dock's solid button downloads
 * the CV, and the hero links the /resume page. Two resume affordances
 * in one seven-item bar was one more than the information deserved.
 *
 * The @ entry navigates to /contact; its tooltip shows the address
 * itself, so hovering answers "what will this get me" before the
 * click.
 */
export const dockItems = [
  { href: "/", label: "Home", icon: "ph:house", iconFill: "ph:house-fill", tooltip: "Home", key: "1" },
  { href: "/work", label: "Work", icon: "ph:stack", iconFill: "ph:stack-fill", tooltip: "Work", key: "2" },
  { href: "/writing", label: "Writing", icon: "ph:notebook", iconFill: "ph:notebook-fill", tooltip: "Writing", key: "3" },
  { href: "/contact", label: "Contact", icon: "ph:envelope-simple", iconFill: "ph:envelope-simple-fill", tooltip: "Contact", key: "4" },
] as const;
