// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  /**
   * Required for absolute URLs in canonical links, Open Graph tags,
   * sitemap.xml, robots.txt and the llms files. Currently the Vercel
   * production URL; swap it for the custom domain when one is added,
   * or every generated absolute URL points at the wrong host.
   */
  site: "https://holdout-ai-engineering.vercel.app",

  /**
   * Astro's dev toolbar is off.
   *
   * It renders its own floating pill at the bottom centre of every dev
   * page, which is exactly where this site's dock lives. The two
   * overlapped, and the toolbar's icons read as part of the design.
   * It is dev-only and never shipped, but it makes the dev server
   * useless for judging the actual layout.
   */
  /* The lab merged into /writing; anything holding an old link gets
     redirected rather than a 404. */
  redirects: {
    "/lab": "/writing",
    "/lab/[...slug]": "/writing/[...slug]",
  },

  devToolbar: {
    enabled: false,
  },

  /**
   * Bind the dev server to 127.0.0.1 explicitly.
   *
   * Left unset, it listens on ::1 only. On Windows "localhost"
   * resolves to ::1 first so that URL works, but http://127.0.0.1:4321
   * is refused outright, which reads as "the site is not running"
   * rather than as an address-family mismatch.
   *
   * Naming the IPv4 loopback fixes both: 127.0.0.1 connects directly,
   * and "localhost" still resolves because browsers fall back to IPv4
   * when ::1 refuses. Not `host: true`, which would publish the dev
   * server to every device on the network.
   */
  server: {
    host: "127.0.0.1",
    port: 4321,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [icon()],
});
