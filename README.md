# @steno/plugin-seo

SEO plugin for [Steno](https://github.com/steno/steno) that automatically
generates standard-compliant XML Sitemaps, RSS feeds, and Atom feeds.

Powered by [jsr:@feed/feed](https://jsr.io/@feed/feed) for robust feed
generation.

## Installation

```yaml
# content/.steno/config.yml
plugins:
  - jsr:@steno/plugin-seo
```

## Options

```yaml
plugins:
  - package: jsr:@steno/plugin-seo
    options:
      siteUrl: https://myawesomeblog.com
      title: "The Code Chronicles"
      description: "Deep dives into Deno, TypeScript, and software architecture."
      authorName: "Gabs"
```

| Option        | Type                               | Default                    | Description                                                                |
| ------------- | ---------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `siteUrl`     | `string`                           | _Required_                 | The absolute production URL of your website (e.g., `https://example.com`). |
| `title`       | `string`                           | `Steno RSS Feed`           | The title used for the RSS and Atom feed headers.                          |
| `description` | `string`                           | `Latest posts...`          | The description/subtitle text for the RSS and Atom feeds.                  |
| `authorName`  | `string`                           | `undefined`                | Optional global author name embedded into the feed metadata.               |
| `robots`      | `false \| { disallow?: string[] }` | enabled, no disallow rules | Controls `robots.txt` generation. See below.                               |

### Disabling robots.txt

If you already manage `robots.txt` yourself, disable generation entirely:

```yaml
plugins:
  - package: jsr:@steno/plugin-seo
    options:
      siteUrl: https://myawesomeblog.com
      robots: false
```

### Disallowing paths

By default the generated `robots.txt` allows crawling of the entire site. To
block specific paths instead, provide `disallow` — this replaces the default
`Allow: /` rule with one `Disallow` line per path:

```yaml
plugins:
  - package: jsr:@steno/plugin-seo
    options:
      siteUrl: https://myawesomeblog.com
      robots:
        disallow:
          - /admin
          - /drafts
```

If a `robots.txt` file already exists in the output directory (for example,
copied in from a site's `public/` directory before `afterBuild` runs), the
plugin logs a warning and leaves it untouched rather than overwriting it.

## Usage

Once installed and configured with your `siteUrl`, the plugin automatically
generates and writes `sitemap.xml`, `feed.xml`, `atom.xml`, and `robots.txt`
directly to your configured output directory on every build:

```text
dist/
├── index.html
├── posts/
│   └── hello-world.html
├── sitemap.xml    <-- Generated Automatically
├── feed.xml       <-- Generated Automatically
├── atom.xml       <-- Generated Automatically
└── robots.txt     <-- Generated Automatically
```

Pages are automatically sorted chronologically by date in descending order. Root
pages (like index or blank paths) are included in the sitemap but intelligently
excluded from the RSS and Atom items array.

## How it works

The plugin hooks into Steno's `afterBuild` pipeline. After all pages are
processed and compiled, the plugin:

1. Loops through the full array of generated site pages.
2. Extracts paths, handles leading slash anomalies, and standardizes standard
   ISO timestamps.
3. Passes entries into the underlying feed module builder to generate correctly
   escaped XML metadata blocks.
4. Leverages Deno's native file system layers to drop the final build documents
   safely alongside your static site assets.
5. Unless disabled via `robots: false`, writes a `robots.txt` pointing crawlers
   at `sitemap.xml`, skipping generation if one already exists in the output
   directory.

## License

MIT
