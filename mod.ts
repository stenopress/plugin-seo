/**
 * Steno plugin for generating an XML Sitemap and RSS feed.
 */
import type { SiteConfig, StenoPlugin } from "steno";
import { join } from "@std/path";
import { Atom, Rss } from "@feed/feed";

/** Options for generated sitemap, RSS, and Atom documents. */
export interface SeoPluginOptions {
  /** Absolute public site URL used to construct page URLs. */
  siteUrl: string;
  /** Feed title. */
  title?: string;
  /** Feed description. */
  description?: string;
  /** Optional feed author name. */
  authorName?: string;
  /**
   * Controls `robots.txt` generation. Set to `false` to disable generation
   * entirely. Provide `disallow` paths to emit `Disallow` rules instead of
   * the default `Allow: /`. Defaults to enabled with no disallow rules.
   */
  robots?: false | { disallow?: string[] };
}

/** Creates a Steno plugin that generates sitemap, RSS, and Atom documents. */
export default function seoPlugin(options: SeoPluginOptions): StenoPlugin {
  if (!options.siteUrl) {
    throw new Error("Steno SEO Plugin: 'siteUrl' option is required.");
  }

  const baseUrl = options.siteUrl.replace(/\/$/, "");
  const feedTitle = options.title ?? "Steno RSS Feed";
  const feedDescription = options.description ??
    "Latest posts from our Steno site";
  const atomFeedTitle = options.title ?? "Steno Atom Feed";
  const atomFeedDescription = options.description ??
    "Latest posts from our Steno site";

  return {
    name: "steno-plugin-seo",

    async afterBuild(config: SiteConfig): Promise<void> {
      const pages = config.pages ?? [];
      const outputDir = config.output ?? "dist";

      const rssFeed = new Rss({
        title: feedTitle,
        description: feedDescription,
        link: `${baseUrl}/`,
        id: `${baseUrl}/feed.xml`,
        authors: options.authorName
          ? [{ name: options.authorName, email: "", link: "" }]
          : [],
      });

      const atomFeed = new Atom({
        title: atomFeedTitle,
        description: atomFeedDescription,
        link: `${baseUrl}/`,
        id: `${baseUrl}/atom.xml`,
        authors: options.authorName ? [{ name: options.authorName }] : [],
      });

      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      sitemap +=
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      const sortedPages = [...pages].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      for (const page of sortedPages) {
        const cleanSlug = page.slug.replace(/^\//, "");
        const url = `${baseUrl}/${cleanSlug}`;
        const pageDate = page.date ? new Date(page.date) : new Date();
        const isoDate = pageDate.toISOString().split("T")[0];

        sitemap += `  <url>\n`;
        sitemap += `    <loc>${url}</loc>\n`;
        sitemap += `    <lastmod>${isoDate}</lastmod>\n`;
        sitemap += `  </url>\n`;

        if (cleanSlug !== "" && cleanSlug !== "index.html") {
          rssFeed.addItem({
            title: page.title ?? "Untitled",
            link: url,
            id: url,
            updated: pageDate,
            description: page.description ?? "",
            content: {
              body: page.description ?? "",
              type: "text",
            },
          });

          atomFeed.addItem({
            title: page.title ?? "Untitled",
            link: url,
            id: url,
            updated: pageDate,
            summary: page.description ?? "",
            content: {
              body: page.description ?? "",
              type: "html",
            },
          });
        }
      }

      sitemap += `</urlset>`;

      await Deno.writeTextFile(join(outputDir, "sitemap.xml"), sitemap);
      await Deno.writeTextFile(join(outputDir, "feed.xml"), rssFeed.build());
      await Deno.writeTextFile(join(outputDir, "atom.xml"), atomFeed.build());

      if (options.robots !== false) {
        const robotsPath = join(outputDir, "robots.txt");

        let robotsExists = false;
        try {
          await Deno.stat(robotsPath);
          robotsExists = true;
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) throw error;
        }

        if (robotsExists) {
          console.warn(
            `Steno SEO Plugin: skipping robots.txt generation because a robots.txt already exists at ${robotsPath}.`,
          );
        } else {
          const disallow = options.robots?.disallow ?? [];

          let robots = `User-agent: *\n`;
          if (disallow.length === 0) {
            robots += `Allow: /\n`;
          } else {
            for (const path of disallow) {
              robots += `Disallow: ${path}\n`;
            }
          }
          robots += `\nSitemap: ${baseUrl}/sitemap.xml\n`;

          await Deno.writeTextFile(robotsPath, robots);
        }
      }
    },
  };
}
