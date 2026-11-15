# openchairadvisory.com

The website for Open Chair Advisory, Alex Williamson's fractional operations practice for early-stage health tech.

It is one static page served by GitHub Pages, with Cloudflare in front of the domain.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Copy, styles, structured data (JSON-LD) and scripts are all inline. |
| `index.md` | The same content as Markdown, for AI assistants and crawlers. |
| `llms.txt` | Short summary for AI assistants, with links to the Markdown and the site. |
| `og-image.png` | 1200 x 630 link preview image used by LinkedIn, Slack, iMessage and X. |
| `robots.txt`, `sitemap.xml` | Crawler rules (all search and AI crawlers allowed) and the sitemap. |
| `favicon.svg` | The chair logo. |
| `worker/` | Cloudflare Worker behind `/api/contact`. It checks Turnstile and emails each form message to the inbox. |

## Keeping the page and the Markdown in sync

The FAQ appears three times: the visible FAQ, the FAQPage schema in `index.html`, and `index.md`. When an answer changes, change all three, and update `dateModified` in the schema and `lastmod` in `sitemap.xml`.

The contact email is kept off the site on purpose. Inquiries go through the form, and the inbox address lives only in the Worker's settings.

## Measuring traffic

All free, all in the Cloudflare dashboard for openchairadvisory.com:

- **Web Analytics**: visits, pages, referrers (including chatgpt.com and perplexity.ai) and Core Web Vitals. No cookies.
- **AI Crawl Control**: which AI crawlers fetch the site, and referrals from AI answer engines.
- **Workers Logs** for `openchair-contact`: one `lead` line per form message, with the source the visitor came from. Each email also says "Came from:".

## Deploying the Worker

From the `worker` folder:

```
npx wrangler deploy --var DEST_EMAIL:<your verified inbox>
```

The Turnstile secret is set once with `npx wrangler secret put TURNSTILE_SECRET`.
