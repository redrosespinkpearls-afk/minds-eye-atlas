# Mind's Eye Atlas — Cloudflare edition (v2.1)

A mobile-friendly, 27-question visual imagery and cognitive-processing self-assessment. It includes 12 scene prompts with **two specific visual-description choices each**, 15 automatically scored spatial/memory/reasoning tasks, hidden active-question timers, personal explanations, research links, and a five-color collective results dashboard.

**Not a diagnostic instrument or IQ test.** Imagery has no objective correct response; self-report cannot establish honesty. The custom levels are not validated medical thresholds. Task timing uses demonstration-only reference windows, not population norms.

## Fastest publishing options

### A. In a browser (recommended if you use Android)

Cloudflare's official **Deploy to Cloudflare** button can provision the Worker and its D1 database automatically from a **public GitHub/GitLab repository**. This package is ready to be used as the root of such a repository. After the repository is published, open:

`https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/YOUR_REPOSITORY`

Sign in to Cloudflare/GitHub, accept the default resources/build configuration, and deploy. The `deploy` command already applies the D1 migration. Cloudflare's button only supports **public Git repositories**; the ZIP file itself is not yet a one-click deployment link. Do not publish participant data or personal secrets in that repository. No secrets are included in this package.

Official explanation: https://developers.cloudflare.com/workers/platform/deploy-buttons/

### B. From a Windows/Mac/Linux PC with Node.js installed

1. Unzip this package, open a terminal **inside** the `Minds_Eye_Atlas_Cloudflare` folder.
2. Run:

```bash
npm install
npm run publish
```

3. When Cloudflare requests authentication, sign in and authorize deployment. The script finds or creates your D1 database, applies the schema, deploys the site, and prints the public `workers.dev` link.

**Subsequent updates:** `npm run deploy` (keeps the same database).

**Local developer preview:** `npm install && npm run dev`; this uses a local D1 database, not the production data.

## Data handling and participant privacy

- No account, email address, advertising trackers, or analytics SDK are built into this test.
- Taking the assessment does not upload responses. A completed test is scored in the browser for private viewing first.
- **Optional consent** sends answer arrays and active-response timing over HTTPS to the Worker, so the Worker can check and recompute scores. Those arrays are *not saved* in D1 or included in application logs.
- D1 stores only the scored summary, its research-category index, strategy, timestamp, deletion-token hash, and **optional** public-list name.
- Everyone who consents contributes to aggregate five-color percentages.
- The separate **individual-result listing** checkbox is off by default. Only opted-in entries appear publicly; an optional nickname is stored only for a public entry.
- Participants can copy a private recovery code to delete a submission. The code is never stored in plaintext server-side. Keep it safe because clearing the browser may lose its local copy.
- Cloudflare processes request metadata under its own privacy and security terms. No application can guarantee zero provider access or perfect anonymity. D1 is private to the account controlling the Worker.
- Public survey percentages reflect *self-selected participants*, not population prevalence; duplicates and automated submissions cannot be fully ruled out without stronger anti-abuse controls.
- No medical claims are made and no clinical assessment should be inferred from challenge performance or response times.

## Website / API

- `GET /` — full assessment
- `GET /api/status` — live connection indicator
- `GET /api/stats` — aggregated category and domain statistics
- `GET /api/entries` — paginated **opted-in** individual summaries only
- `POST /api/submit` — validates questions, recomputes scores, saves **summary only**
- `POST /api/delete` — requires private recovery code; deletes saved summary

All queries use D1 prepared statements. Responses include no-cache headers. The site uses same-origin API requests and restrictive browser security headers. Raw question data and deletion secrets are never placed in the public asset directory.

## Project layout

```text
public/index.html   Responsive visual shell
public/app.js       Full questionnaire, timing, charts and personal explanations
src/index.js       Scoring validator and Cloudflare Worker API
migrations/        Private D1 database schema
scripts/publish.mjs One-command local deployment helper
wrangler.jsonc      Cloudflare configuration + D1 binding
```

## Testing and production checklist

Run `npm test` for scoring and API tests. Run `npm run check` for syntax checks. Before sharing your public link, complete a test, check that the private results appear before the collective chart, verify anonymous and named submissions, confirm a result can be deleted, and test a second device. Make sure Cloudflare's deployment logs show that the database migration completed.

**Important:** This package has been built and locally tested; no live Cloudflare deployment exists until you authorize a deployment to your account. Google Sheets are not connected to this version.