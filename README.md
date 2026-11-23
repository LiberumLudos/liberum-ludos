# Liberum Ludos

A free-to-host, static-first giveaway discovery and social-sharing application.

## Included in this first release

- Responsive dark medieval / antique-gold interface
- Live GamerPower giveaway feed (no API key)
- Full games, DLC, in-game loot, and beta/playtest categorization
- Search, platform filtering, offer-type filtering, ending-soon filter, sorting
- Per-platform copy-ready messages for Discord, X, Reddit, Facebook, Bluesky, and Telegram
- PNG promotional-card export using the browser Canvas API
- Cloudflare Pages Function proxy with short caching
- Direct API fallback for local static preview

## Important source coverage notes

The first release uses GamerPower as its live source. It covers multiple PC, console, and mobile platforms, but it is not an exhaustive index of every free game offer on the internet. Some official store promotions, regional offers, and publisher giveaways may not be indexed.

IsThereAnyDeal has a giveaways API, but its published API terms prohibit using its data to create or help a competing service without permission. Liberum Ludos is a public giveaway index, so do not connect IsThereAnyDeal unless you obtain written approval from IsThereAnyDeal first. Documentation: https://docs.isthereanydeal.com/ and terms: https://github.com/IsThereAnyDeal/API

GamerPower requires attribution. This application includes an attribution link in the page footer area. Review the provider's current terms before public launch: https://www.gamerpower.com/api-read

## Run locally

Because browser security can block local API requests from `file://`, use a local static server.

With Python installed:
```bash
python -m http.server 8000
```
Then open http://localhost:8000

The frontend first requests `/api/giveaways` (Cloudflare Pages Function). If that route is unavailable, it falls back to `https://www.gamerpower.com/api/giveaways`.

## Deploy free on Cloudflare Pages

1. Create a free Cloudflare account: https://dash.cloudflare.com/sign-up
2. Create a GitHub repository and upload the contents of this folder (keep `functions/` at the project root).
3. In Cloudflare, open **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
4. Select the repository.
5. For a plain static site, set:
   - Framework preset: None
   - Build command: leave blank
   - Build output directory: `/` (or `.` if the dashboard requests a relative path)
6. Deploy. Cloudflare Pages automatically deploys the `functions/api/giveaways.js` route as `/api/giveaways`.
7. Your site will receive a free `*.pages.dev` address.

If Pages does not detect the function, check that `functions/api/giveaways.js` is at the repository root, alongside `index.html`.

## Wix embedding (optional later)

You chose standalone hosting. If you later want to show the standalone site inside Wix, use Wix's Embed HTML / website iframe element and the HTTPS `pages.dev` URL. The standalone site remains the canonical application.

## Current limitations / next steps

- GamerPower's API does not expose every possible source and its `loot` type combines some DLC and in-game items. The app makes a best-effort distinction based on offer title/description.
- Artwork export works when the remote image host allows cross-origin image access. If the image host blocks it, the exported card will still contain the title and offer details but omit the artwork background.
- Social post lengths and rich formatting vary; users should review before publishing.
- Dates are displayed using the browser's local timezone when the provider supplies an end date.
- There is no user account, paid database, or paid API in this release.
- Add more sources only through documented APIs or permitted feeds; do not scrape sites that prohibit it.
