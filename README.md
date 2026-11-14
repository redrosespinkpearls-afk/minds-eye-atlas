# Mind's Eye Atlas — Cloudflare edition

A privacy-first 27-question interactive mental imagery and cognitive-processing assessment.

## Deploy from GitHub

Source: https://github.com/redrosespinkpearls-afk/minds-eye-atlas

Cloudflare Deploy link:

https://deploy.workers.cloudflare.com/?url=https://github.com/redrosespinkpearls-afk/minds-eye-atlas

**Important:** In Cloudflare's Workers & Pages project, the deployment command can remain `npx wrangler deploy`. The application now uses a SQLite-backed Durable Object, which Cloudflare provisions during deployment. No D1 database ID, separate database creation, or migration command is required.

### If an earlier build failed with Cloudflare error 10181

The former configuration referenced a placeholder D1 database ID. That configuration has been removed. In Cloudflare, open **Workers & Pages → minds-eye-atlas → Deployments → Retry deployment** (or use the new-deployment flow). Make sure it pulls the latest GitHub commit and does **not** lock to the old failing commit.

If your Cloudflare project was imported into an automatically generated fork, it may be tracking that separate fork rather than `redrosespinkpearls-afk/minds-eye-atlas`. In that case, reconnect this original GitHub repository or use the Cloudflare Deploy link above to create a new Worker from the updated version.

### Local development (optional)

```bash
npm install
npm run dev
```

To deploy with a locally authorized Cloudflare account: `npm run deploy`.

## Architecture

- `public/index.html`: accessible mobile-first assessment UI
- `public/app.js`: imagery prompts, specific detail responses, memory and reasoning challenges, personal interpretation and collective chart
- `public/privacy.html`: participant privacy notice
- `src/index.js`: Worker API and the `AtlasStore` Durable Object class
- `wrangler.jsonc`: Cloudflare assets and SQLite Durable Object configuration

Cloudflare automatically creates the Durable Object namespace using `new_sqlite_classes` with tag `v1`. The object initializes its private SQLite tables when first used. A single named object stores the collective statistics and consenting participant summaries, so all devices query the same dataset.

## Privacy

- Taking the assessment does not automatically publish a score.
- People explicitly opt in to contribute to aggregate percentages.
- An additional checkbox controls whether an individual's summary and optional name appear in the public list.
- The browser sends answers and response times to the Worker solely to verify scores. The application does not store those raw arrays.
- Only summary scores, imagery category, optional display name, and a hashed deletion recovery token are stored.
- Participants can request deletion using their recovery code.
- Cloudflare may process hosting and network metadata, as with any online service.

## Medical and research limitations

This assessment is educational and exploratory, not a diagnosis, IQ test, or standardized timing benchmark. Its five imagery bands are descriptions based on custom self-ratings and should never be treated as validated medical thresholds. Its collective sample is voluntary and cannot estimate population prevalence.

## API

- `GET /api/status`: confirms storage is available
- `GET /api/stats`: aggregate distribution, total count, and domain means
- `GET /api/entries`: individually published results only, paginated
- `POST /api/submit`: validates and recomputes a consented result
- `POST /api/delete`: removes a result using its deletion recovery code

## Testing

Run `npm run check` to check JavaScript syntax. The public deployment should return `{"online":true}` from `/api/status` after the SQLite Durable Object initializes. Verify aggregate count and deletion behavior with test submissions before inviting the public.
