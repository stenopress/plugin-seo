/**
 * Steno plugin for generating an XML Sitemap and RSS feed.
 */
import type {StenoPlugin} from "steno";
import {join} from "@std/path";
import {Rss} from "@feed/feed";

export interface SeoPluginOptions {
    siteUrl: string;
    title?: string;
    description?: string;
    authorName?: string;
}

// Minimal matching interface for Steno's internal runtime state
export interface SiteConfig {
    output?: string;
    pages?: Array<{
        slug: string;
        title?: string;
        description?: string;
        date?: string | Date;
    }>;
}

export default function seoPlugin(options: SeoPluginOptions): StenoPlugin {
    if (!options.siteUrl) {
        throw new Error("Steno SEO Plugin: 'siteUrl' option is required.");
    }

    const baseUrl = options.siteUrl.replace(/\/$/, "");
    const feedTitle = options.title ?? "Steno RSS Feed";
    const feedDescription = options.description ?? "Latest posts from our Steno site";

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
                authors: options.authorName ? [{name: options.authorName, email: "", link: ""}] : [],
            });

            let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
            sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

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
                }
            }

            sitemap += `</urlset>`;

            await Deno.writeTextFile(join(outputDir, "sitemap.xml"), sitemap);
            await Deno.writeTextFile(join(outputDir, "feed.xml"), rssFeed.build());
        },
    };
}