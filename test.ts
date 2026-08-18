import { assert, assertStringIncludes, assertThrows } from "@std/assert";
import seoPlugin from "./mod.ts";

Deno.test({
  name: "seo: throws an error if siteUrl is missing",
  fn: () => {
    assertThrows(
      // @ts-ignore testing runtime exception fallback safely
      () => seoPlugin({ siteUrl: "" }),
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
    Deno.writeTextFile = (
      path: string | URL,
      data: string | ReadableStream<string>,
    ): Promise<void> => {
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

      await plugin.afterBuild!(mockConfig);

      assert(writtenFiles["dist/sitemap.xml"] !== undefined);
      assert(writtenFiles["dist/feed.xml"] !== undefined);
      assert(writtenFiles["dist/atom.xml"] !== undefined);

      // Verify built structures
      assertStringIncludes(
        writtenFiles["dist/sitemap.xml"],
        "<loc>https://myblog.com/posts/hello-world</loc>",
      );

      // Look for signatures rendered explicitly via @feed/feed for RSS
      assertStringIncludes(
        writtenFiles["dist/feed.xml"],
        "<title>Custom Blog title</title>",
      );
      assertStringIncludes(
        writtenFiles["dist/feed.xml"],
        "<link>https://myblog.com/posts/hello-world</link>",
      );
      assertStringIncludes(
        writtenFiles["dist/feed.xml"],
        "Hello &lt;World&gt;",
      );
      // Corrected assertion for RSS author tag
      assertStringIncludes(
        writtenFiles["dist/feed.xml"],
        "<author>(Test Author)</author>",
      );

      // Look for signatures rendered explicitly via @feed/feed for Atom
      assertStringIncludes(
        writtenFiles["dist/atom.xml"],
        "<title>Custom Blog title</title>",
      );
      assertStringIncludes(
        writtenFiles["dist/atom.xml"],
        '<link href="https://myblog.com/posts/hello-world"/>',
      );
      assertStringIncludes(
        writtenFiles["dist/atom.xml"],
        "<name>Test Author</name>",
      );
      // Corrected assertion for Atom summary tag (removed type="html")
      assertStringIncludes(
        writtenFiles["dist/atom.xml"],
        "<summary>A post description</summary>",
      );
      assertStringIncludes(
        writtenFiles["dist/atom.xml"],
        '<content type="html">A post description</content>',
      );
    } finally {
      Deno.writeTextFile = originalWriteTextFile;
    }
  },
});

Deno.test({
  name:
    "seo: includes root/index pages in the sitemap but excludes them from RSS/Atom, and sorts by date descending",
  fn: async () => {
    const plugin = seoPlugin({ siteUrl: "https://myblog.com/" });

    const writtenFiles: Record<string, string> = {};
    const originalWriteTextFile = Deno.writeTextFile;

    Deno.writeTextFile = (
      path: string | URL,
      data: string | ReadableStream<string>,
    ): Promise<void> => {
      writtenFiles[String(path)] = typeof data === "string" ? data : "[Stream]";
      return Promise.resolve();
    };

    try {
      const mockConfig = {
        output: "dist",
        title: "Test Blog",
        description: "Test description",
        author: "Tester",
        pages: [
          {
            slug: "",
            title: "Home",
            description: "Homepage",
            date: "2026-01-01T00:00:00Z",
          },
          {
            slug: "index.html",
            title: "Index",
            description: "Index page",
            date: "2026-01-02T00:00:00Z",
          },
          {
            slug: "posts/older-post",
            title: "Older Post",
            description: "An older post",
            date: "2026-01-01T00:00:00Z",
          },
          {
            slug: "posts/newer-post",
            title: "Newer Post",
            description: "A newer post",
            date: "2026-02-01T00:00:00Z",
          },
        ],
      };

      await plugin.afterBuild!(mockConfig);

      const sitemap = writtenFiles["dist/sitemap.xml"];
      const rss = writtenFiles["dist/feed.xml"];
      const atom = writtenFiles["dist/atom.xml"];

      // Root and index.html pages appear in the sitemap...
      assertStringIncludes(sitemap, "<loc>https://myblog.com/</loc>");
      assertStringIncludes(sitemap, "<loc>https://myblog.com/index.html</loc>");

      // ...but are excluded from RSS/Atom item lists.
      assert(
        !rss.includes("<title>Home</title>") &&
          !rss.includes("<title>Index</title>"),
        "root/index pages should not appear as RSS items",
      );
      assert(
        !atom.includes("<title>Home</title>") &&
          !atom.includes("<title>Index</title>"),
        "root/index pages should not appear as Atom items",
      );

      // Non-root pages are included, ordered newest-first.
      const rssNewerIdx = rss.indexOf("Newer Post");
      const rssOlderIdx = rss.indexOf("Older Post");
      assert(rssNewerIdx !== -1 && rssOlderIdx !== -1);
      assert(
        rssNewerIdx < rssOlderIdx,
        "expected newer post to appear before older post in RSS feed",
      );
    } finally {
      Deno.writeTextFile = originalWriteTextFile;
    }
  },
});

Deno.test({
  name: "seo: defaults pages to [] and output to 'dist' when omitted",
  fn: async () => {
    const plugin = seoPlugin({ siteUrl: "https://myblog.com/" });

    const writtenFiles: Record<string, string> = {};
    const originalWriteTextFile = Deno.writeTextFile;

    Deno.writeTextFile = (
      path: string | URL,
      data: string | ReadableStream<string>,
    ): Promise<void> => {
      writtenFiles[String(path)] = typeof data === "string" ? data : "[Stream]";
      return Promise.resolve();
    };

    try {
      // Neither `pages` nor `output` provided.
      const mockConfig = {
        title: "Test Blog",
        description: "Test description",
        author: "Tester",
      };

      await plugin.afterBuild!(mockConfig);

      assert(writtenFiles["dist/sitemap.xml"] !== undefined);
      assert(writtenFiles["dist/feed.xml"] !== undefined);
      assert(writtenFiles["dist/atom.xml"] !== undefined);
      assertStringIncludes(
        writtenFiles["dist/sitemap.xml"],
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>',
      );
    } finally {
      Deno.writeTextFile = originalWriteTextFile;
    }
  },
});

Deno.test({
  name: "seo: generates a default robots.txt allowing all crawling",
  fn: async () => {
    const plugin = seoPlugin({ siteUrl: "https://myblog.com/" });

    const writtenFiles: Record<string, string> = {};
    const originalWriteTextFile = Deno.writeTextFile;
    const originalStat = Deno.stat;

    Deno.writeTextFile = (
      path: string | URL,
      data: string | ReadableStream<string>,
    ): Promise<void> => {
      writtenFiles[String(path)] = typeof data === "string" ? data : "[Stream]";
      return Promise.resolve();
    };

    Deno.stat = (): Promise<Deno.FileInfo> => {
      return Promise.reject(new Deno.errors.NotFound());
    };

    try {
      const mockConfig = {
        output: "dist",
        title: "Test Blog",
        description: "Test description",
        author: "Tester",
        pages: [],
      };
      await plugin.afterBuild!(mockConfig);

      assert(writtenFiles["dist/robots.txt"] !== undefined);
      assertStringIncludes(writtenFiles["dist/robots.txt"], "User-agent: *");
      assertStringIncludes(writtenFiles["dist/robots.txt"], "Allow: /");
      assertStringIncludes(
        writtenFiles["dist/robots.txt"],
        "Sitemap: https://myblog.com/sitemap.xml",
      );
    } finally {
      Deno.writeTextFile = originalWriteTextFile;
      Deno.stat = originalStat;
    }
  },
});

Deno.test({
  name: "seo: skips robots.txt generation when robots is set to false",
  fn: async () => {
    const plugin = seoPlugin({
      siteUrl: "https://myblog.com/",
      robots: false,
    });

    const writtenFiles: Record<string, string> = {};
    const originalWriteTextFile = Deno.writeTextFile;

    Deno.writeTextFile = (
      path: string | URL,
      data: string | ReadableStream<string>,
    ): Promise<void> => {
      writtenFiles[String(path)] = typeof data === "string" ? data : "[Stream]";
      return Promise.resolve();
    };

    try {
      const mockConfig = {
        output: "dist",
        title: "Test Blog",
        description: "Test description",
        author: "Tester",
        pages: [],
      };
      await plugin.afterBuild!(mockConfig);

      assert(writtenFiles["dist/robots.txt"] === undefined);
    } finally {
      Deno.writeTextFile = originalWriteTextFile;
    }
  },
});

Deno.test({
  name: "seo: emits Disallow rules and omits Allow when disallow paths given",
  fn: async () => {
    const plugin = seoPlugin({
      siteUrl: "https://myblog.com/",
      robots: { disallow: ["/admin"] },
    });

    const writtenFiles: Record<string, string> = {};
    const originalWriteTextFile = Deno.writeTextFile;
    const originalStat = Deno.stat;

    Deno.writeTextFile = (
      path: string | URL,
      data: string | ReadableStream<string>,
    ): Promise<void> => {
      writtenFiles[String(path)] = typeof data === "string" ? data : "[Stream]";
      return Promise.resolve();
    };

    Deno.stat = (): Promise<Deno.FileInfo> => {
      return Promise.reject(new Deno.errors.NotFound());
    };

    try {
      const mockConfig = {
        output: "dist",
        title: "Test Blog",
        description: "Test description",
        author: "Tester",
        pages: [],
      };
      await plugin.afterBuild!(mockConfig);

      assertStringIncludes(writtenFiles["dist/robots.txt"], "Disallow: /admin");
      assert(!writtenFiles["dist/robots.txt"].includes("Allow: /\n"));
    } finally {
      Deno.writeTextFile = originalWriteTextFile;
      Deno.stat = originalStat;
    }
  },
});

Deno.test({
  name: "seo: does not overwrite an existing robots.txt",
  fn: async () => {
    const plugin = seoPlugin({ siteUrl: "https://myblog.com/" });

    const writtenFiles: Record<string, string> = {};
    const originalWriteTextFile = Deno.writeTextFile;
    const originalStat = Deno.stat;
    const originalWarn = console.warn;

    let warned = false;

    Deno.writeTextFile = (
      path: string | URL,
      data: string | ReadableStream<string>,
    ): Promise<void> => {
      writtenFiles[String(path)] = typeof data === "string" ? data : "[Stream]";
      return Promise.resolve();
    };

    Deno.stat = (path: string | URL): Promise<Deno.FileInfo> => {
      if (String(path).endsWith("robots.txt")) {
        return Promise.resolve({} as Deno.FileInfo);
      }
      return Promise.reject(new Deno.errors.NotFound());
    };

    console.warn = () => {
      warned = true;
    };

    try {
      const mockConfig = {
        output: "dist",
        title: "Test Blog",
        description: "Test description",
        author: "Tester",
        pages: [],
      };
      await plugin.afterBuild!(mockConfig);

      assert(writtenFiles["dist/robots.txt"] === undefined);
      assert(warned, "expected a console.warn call when robots.txt exists");
    } finally {
      Deno.writeTextFile = originalWriteTextFile;
      Deno.stat = originalStat;
      console.warn = originalWarn;
    }
  },
});
