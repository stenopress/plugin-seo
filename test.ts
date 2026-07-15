import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import seoPlugin from "./mod.ts";

// deno-lint-ignore no-explicit-any
type StenoPluginAny = any;

Deno.test({
    name: "seo: throws an error if siteUrl is missing",
    fn: () => {
        assertRejects(
            // @ts-ignore testing runtime exception fallback safely
            async () => seoPlugin({ siteUrl: "" }),
            Error,
            "Steno SEO Plugin: 'siteUrl' option is required.",
        );
    },
});

Deno.test({
    name: "seo: builds correct feeds with jsr:@feed/feed integration",
    fn: async () => {
        const plugin = seoPlugin({
            siteUrl: "https://myblog.com/",
            title: "Custom Blog title",
            description: "My feed specification details",
            authorName: "Test Author",
        });

        const writtenFiles: Record<string, string> = {};
        const originalWriteTextFile = Deno.writeTextFile;

        // Fixed parameter type signature matching Deno's global scope exactly
        Deno.writeTextFile = (path: string | URL, data: string | ReadableStream<string>): Promise<void> => {
            writtenFiles[String(path)] = typeof data === "string" ? data : "[Stream]";
            return Promise.resolve();
        };

        try {
            // Mock configuration matching Steno runtime requirements fully via casting
            const mockConfig = {
                output: "dist",
                title: "Test Blog",
                description: "Test description",
                author: "Tester",
                pages: [
                    {
                        slug: "posts/hello-world",
                        title: "Hello <World>",
                        description: "A post description",
                        date: "2026-01-01T12:00:00Z",
                    },
                ],
            };

            await (plugin as StenoPluginAny).afterBuild!(mockConfig);

            assert(writtenFiles["dist/sitemap.xml"] !== undefined);
            assert(writtenFiles["dist/feed.xml"] !== undefined);
            assert(writtenFiles["dist/atom.xml"] !== undefined);

            // Verify built structures
            assertStringIncludes(writtenFiles["dist/sitemap.xml"], "<loc>https://myblog.com/posts/hello-world</loc>");

            // Look for signatures rendered explicitly via @feed/feed for RSS
            assertStringIncludes(writtenFiles["dist/feed.xml"], "<title>Custom Blog title</title>");
            assertStringIncludes(writtenFiles["dist/feed.xml"], "<link>https://myblog.com/posts/hello-world</link>");
            assertStringIncludes(writtenFiles["dist/feed.xml"], "Hello &lt;World&gt;");
            // Corrected assertion for RSS author tag
            assertStringIncludes(writtenFiles["dist/feed.xml"], "<author>(Test Author)</author>");

            // Look for signatures rendered explicitly via @feed/feed for Atom
            assertStringIncludes(writtenFiles["dist/atom.xml"], "<title>Custom Blog title</title>");
            assertStringIncludes(writtenFiles["dist/atom.xml"], "<link href=\"https://myblog.com/posts/hello-world\"/>");
            assertStringIncludes(writtenFiles["dist/atom.xml"], "<name>Test Author</name>");
            // Corrected assertion for Atom summary tag (removed type="html")
            assertStringIncludes(writtenFiles["dist/atom.xml"], "<summary>A post description</summary>");
            assertStringIncludes(writtenFiles["dist/atom.xml"], "<content type=\"html\">A post description</content>");
        } finally {
            Deno.writeTextFile = originalWriteTextFile;
        }
    },
});