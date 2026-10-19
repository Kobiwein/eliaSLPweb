# Elia clinic CMS

A server-rendered Hebrew clinic site with an authenticated CMS, deployed through Sites on Cloudflare Workers and D1.

## Recovery
The original static site is preserved at GitHub branch `backup/site-before-cms-2026-10-19`, commit `8437aecd34a327cc463ce7e69fec6a2cb97da1f5` in `Kobiwein/eliaSLPweb`.

## Administration
Open `/admin` and sign in with the configured administrator's ChatGPT account. `CMS_ADMIN_EMAIL` is a server-only Sites secret. No public registration or first-visitor administrator assignment exists. To appoint another administrator, the site owner must change that secret and redeploy.

Choose a page, edit plain-text fields, and save a draft. Preview opens the saved draft and requires admin authorization. Publish updates the public page immediately. New articles use a title, summary, category, and text body; separate paragraphs with a blank line, and start a subheading with `## `. New published articles appear on the home page and article index. Unpublish keeps a new article as a private draft. Revision history restores an earlier draft, which must then be published explicitly. Export content periodically using the backup link. The export includes all database documents and revisions; initial template content is versioned in the source.

## Security model
Every admin API and draft preview checks the platform-verified user identity against the server-side administrator configuration. Mutations require matching Origin and JSON content type. Queries use bound parameters. Editable text is HTML-escaped, never executed as HTML or JavaScript. Draft and published content are stored separately. Writes use optimistic version checks, with revision capture and update in one database batch. Administrator responses are not cached. Database bindings and secrets are server-only. Local mock authentication belongs to the starter's development mode and is absent from production builds.

This CMS stores website content, not patient records. Existing contact behavior is retained. The legacy HTML and its inline scripts are trusted source templates; administrators can edit text but cannot replace scripts. A CSP is applied to public HTML. Keep framework dependencies patched and review any future file-upload or rich-HTML feature separately.

## Development
Node 22.13+ required. Install with the Sites install helper (or `npm run install:ci`). Configure `.dev.vars` locally with `CMS_ADMIN_EMAIL=seedy@sites.test`; this file is ignored. Generate schema-only migrations with `npm run db:generate`. Build with the Sites build helper. Apply each new migration to local D1 using the generated Wrangler config, then run `npm run dev`.

Tests: `node --test scripts/security.test.mjs`, `npx tsc --noEmit`, then with a running local preview and initialized local D1: `node scripts/integration-test.mjs`. The integration test creates an unpublished local test article. Local database files are ignored and never deployed.

## Deployment and ownership
`.openai/hosting.json` identifies the hosted project and D1 binding. Use the Sites source workflow for commit/push, packaging, version save and deployment. Hosted migrations are applied by Sites. D1 data is separate from the source and from the local preview database. Export content before major changes. GitHub Pages cannot run this backend; the full CMS runs at the hosted Sites URL. The original GitHub Pages site remains a static recovery copy until explicitly redirected.
