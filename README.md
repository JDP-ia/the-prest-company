# The Prest Company LLC

Version 1 of the official Michigan company website: one identity-led landing page, current government-services development, future areas, and direct contact.

## Stack and design

Semantic HTML, responsive CSS, and a small progressively enhanced JavaScript form handler. Node 22+ builds and serves the site using only built-in modules. No production dependencies, trackers, cookies, analytics, remote fonts, or photo assets.

The visual system uses near-black, off-white condensed PREST lettering, an indigo current-focus section, and restrained pink accents. Mobile stretches the wordmark vertically and recomposes the editorial grid. The display font is a licensed, condensed subset of DejaVu Sans Bold; its full notice is in `src/assets/FONT-LICENSE.txt`. The original source is https://dejavu-fonts.github.io/. The hero wordmark is isolated in `.wordmark`, so it can later be replaced by custom artwork without changing the site structure. No tagline or unsubstantiated business claims are included.

## Local development and exact preview

```sh
git clone --branch feat/prest-v1 https://github.com/JDP-ia/the-prest-company.git
cd the-prest-company
npm run dev
```

Open **http://localhost:4173**. No `npm install` is needed for the website or build tests. Stop with Ctrl+C.

For the production output:

```sh
npm test
npm run build
npm run preview
```

Open **http://localhost:4173**. Run only one preview server on that port. Use `PORT=4176 npm run preview` to change it on macOS/Linux. The build generates `dist/`; source files remain untouched.

## Contact form — configuration required

**Email delivery is not active yet.** The clickable email address works through the visitor's email app. Until configured, the form displays an honest unavailable notice, preserves the inquiry, makes no network submission, and never displays a false success.

1. In [Formspree](https://formspree.io/), create a form named `Prest website inquiries` and set the notification recipient to **theprestcompany@gmail.com**.
2. Complete Formspree's recipient verification using the confirmation email sent to that inbox. No Gmail connection, password, or API key is needed in this site.
3. Copy the public form ID from the provided endpoint `https://formspree.io/f/FORM_ID`.
4. Set the build environment variable `FORMSPREE_FORM_ID` to that ID and rebuild. Locally, on macOS/Linux: `FORMSPREE_FORM_ID=youractualid npm run build`. On PowerShell: `$env:FORMSPREE_FORM_ID='youractualid'; npm run build`. `.env.example` documents the values; the build intentionally does **not** load `.env` files automatically.
5. Preview/deploy that build, send a real inquiry, and confirm it arrives at the Gmail address. Check Formspree spam filtering if it does not. Enable provider-side domain restrictions once the host is known. Do not declare delivery operational before this test.

The public form ID is an endpoint identifier, not a secret. No secrets belong in this repository. The form submits `name`, `email`, `organization`, `subject`, `message`, and `_gotcha`. Native required/email validation, whitespace checks, an accessible live result, duplicate-submit prevention, a timeout, preserved fields on error, and Formspree's honeypot convention are included. Success means the provider has accepted the inquiry; it does not guarantee inbox delivery. A configured form also supports native POST with JavaScript disabled (Formspree supplies that confirmation page).

Provider references: [HTML/AJAX integration](https://formspree.io/blog/formspree-ajax/), [honeypot filtering](https://help.formspree.io/articles/building-your-form/honeypot-spam-filtering/).

## Deployment — no custom domain configured

The output is ordinary static files and can be hosted by any HTTPS static host. A `netlify.toml` is provided for an optional Netlify deployment: select this repository and branch, use `npm run build`, and publish `dist`. Do not buy a plan or attach a custom domain as part of this implementation. No DNS changes have been made.

For a review deployment, leave `SITE_URL` empty: the output intentionally carries `noindex, nofollow` and a disallowing `robots.txt`. This prevents an unfinished preview being represented as the official public website. It is not access control.

When public launch is authorized, set `SITE_URL` to the exact final HTTPS site URL (include a subdirectory when applicable), set the verified `FORMSPREE_FORM_ID`, then rebuild. This enables indexing and generates the canonical URL, absolute OpenGraph image and page URLs, robots policy, and sitemap. There is no invented domain. On hosts other than Netlify, apply equivalent security headers from `netlify.toml` using that host's configuration. Do not add an SPA catch-all redirect: this is a single HTML page with normal anchor navigation.

## Structure

```text
src/index.html                 Page, copy, semantic structure, form
src/styles.css                 Tokens, layout, responsive/reduced-motion styles
src/contact.js                 Progressive form submission and result states
src/assets/                    Self-hosted display font, license, favicon, social art
src/robots.txt                 Safe review default
scripts/build.mjs              Static build and validated public configuration
scripts/serve.mjs              Local preview server (GET/HEAD only)
scripts/make-display-font.py    Optional font-maintenance source; not a build dependency
tests/build.test.mjs            Build/configuration/assets/contrast checks
tests/browser.mjs              Browser behavior and screenshot checks
.github/workflows/quality.yml  CI build and browser checks; review artifacts
netlify.toml                   Optional hosting configuration and security headers
```

CSS tokens define colors, typography, spacing, widths, borders, transitions, and layering. Responsive breakpoints are 600px, 900px, and 1600px. CSS custom properties cannot be used directly in native media conditions, so these are literal breakpoints. The system can support future identities without empty routes or implied subsidiaries.

## QA

`npm test` checks both configured and unconfigured output, subdirectory URLs, links/assets, unsafe configuration, and contrast ratios. The local production build and a live HTTP 200 preview response were verified.

For browser QA:

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
npm run test:browser
```

The optional QA package is not shipped to visitors. CI installs it only for testing. Tests cover widths 320, 390, 430, 768, 1280, 1440, 1920, and 2560; wordmark clipping and document overflow; asset/anchor integrity; console errors; keyboard/focus behavior; validation; reduced motion; JavaScript-disabled content; and intercepted success, failure, malformed-response, and network-error form scenarios. **No automated test sends a real inquiry.** Screenshots and a report are saved under ignored `artifacts/` and uploaded as the `prest-review` CI artifact.

Local browser execution was blocked in the authoring environment: no browser binary was available, the browser download returned invalid content, and the shared browser blocked localhost. Do not treat the existence of the browser suite as proof it passed. Check the actual GitHub Actions result and visually review its screenshots before merge. The social-preview asset was visually inspected; this is not a substitute for full-page browser review.

Remaining release gates: passing browser QA and visual review, a verified Formspree endpoint and real delivery test, and the authorized deployment URL. No custom domain has been published.
