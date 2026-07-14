# @steno/plugin-seo

SEO plugin for [Steno](https://github.com/steno/steno) that automatically generates standard-compliant XML Sitemaps and RSS feeds.

Powered by [jsr:@feed/feed](https://jsr.io/@feed/feed) for robust RSS generation.

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

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `siteUrl` | `string` | *Required* | The absolute production URL of your website (e.g., `https://example.com`). |
| `title` | `string` | `Steno RSS Feed` | The title used for the RSS channel header. |
| `description` | `string` | `Latest posts...` | The description/subtitle text for the RSS channel. |
| `authorName` | `string` | `undefined` | Optional global author name embedded into the feed metadata. |

## Usage

Once installed and configured with your `siteUrl`, the plugin automatically generates and writes `sitemap.xml` and `feed.xml` directly to your configured output directory on every build:

```text
dist/
├── index.html
├── posts/
│   └── hello-world.html
├── sitemap.xml    <-- Generated Automatically
└── feed.xml       <-- Generated Automatically

```

Pages are automatically sorted chronologically by date in descending order. Root pages (like index or blank paths) are included in the sitemap but intelligently excluded from the RSS items array.

## How it works

The plugin hooks into Steno's `afterBuild` pipeline. After all pages are processed and compiled, the plugin:

1. Loops through the full array of generated site pages.
2. Extracts paths, handles leading slash anomalies, and standardizes standard ISO timestamps.
3. Passes entries into the underlying feed module builder to generate correctly escaped XML metadata blocks.
4. Leverages Deno's native file system layers to drop the final build documents safely alongside your static site assets.

## License

MIT