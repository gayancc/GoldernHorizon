# Golden Horizon

Golden Horizon is a Vite landing page for a Toronto live band playing private
parties, pubs, and bars. Firebase Hosting serves the site and a first-generation
Firebase HTTPS function sends booking emails.

## Scroll-cinematic experience

`index.html` is a scroll-driven cinematic site. The hero plays a high-end
cinematic clip as a **scroll-scrubbed image sequence** drawn to a sticky canvas:
scroll position maps to the frame index, so the camera push-in is controlled by
the scroll wheel. Two further cinematic sections (`clip1`, `clip2`) render
dependency-free procedural 3D scenes (a gold particle tunnel and a golden-horizon
fly-over) that **auto-upgrade to real frame sequences** the moment matching frames
exist on disk.

The engine is rAF-free-safe: it sizes canvases with a `ResizeObserver`, reveals
content and animates the hero with CSS transitions/keyframes, and drives scrubbing
from scroll when `requestAnimationFrame` is throttled — so it still works in
background tabs and embedded webviews. It also respects `prefers-reduced-motion`.

### Cinematic frames

Frames live in `public/frames/<name>/` alongside a `manifest.json`
(`{ name, count, width, fps, pattern, base }`) that the site reads to know how
many frames to preload. The hero master clip is kept at
`public/media/hero-master.mp4`.

`scripts/slice-frames.mjs` (via `ffmpeg-static`) downloads a rendered clip and
slices it into an evenly-spaced JPG sequence:

```bash
# Slice a clip into a named frame sequence
npm run slice -- --input <url|path> --name hero --fps 15 --width 1200 --quality 4
```

To activate the two 3D-clip sections with real footage, generate a continuous
single-shot 1080p clip (e.g. via the Higgsfield MCP), then:

```bash
npm run slice -- --input <clip1-url> --name clip1
npm run slice -- --input <clip2-url> --name clip2
```

The site detects `/frames/clip1/manifest.json` and `/frames/clip2/manifest.json`
on load and swaps each procedural scene for the real sequence automatically — no
code change required.

> `index.legacy.html` is the previous single-view site, kept as a backup. It is
> not a Vite build input, so it is neither built nor deployed.

## Local development

Install website and function dependencies:

```bash
npm ci
npm ci --prefix functions
```

Run the website:

```bash
npm run dev
```

The Vite server proxies `/api/contact` to the local Firebase Functions emulator
on port `5001`. Complete `functions/mail.config.js`, then start the emulator in
another terminal to test email:

```bash
npm run emulators
```

## Contact email

The browser posts booking requests to `/api/contact`. Firebase Hosting rewrites
that path to the `contact` function in `us-central1`.

The contact endpoint uses a first-generation HTTPS Function because this site
does not need Eventarc or other second-generation event infrastructure.

The function:

- validates and limits all fields server-side
- accepts only party and pub/bar booking types
- verifies a single-use Cloudflare Turnstile token server-side
- uses two honeypots, timing checks, origin checks, payload limits, URL filters,
  duplicate suppression, and separate IP/email rate limits
- emails the private booking inbox
- does not send automatic email to submitted addresses, preventing relay abuse
- never exposes SMTP credentials or the recipient inbox to the browser

### Anti-spam configuration

Create a free Turnstile widget in the
[Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile),
add the production Firebase/custom domains, then edit
`public/turnstile-config.json` with the public site key and
`functions/security.config.js` with the private secret key:

```json
{
  "siteKey": "your-public-site-key"
}
```

```js
module.exports = Object.freeze({
  turnstile: {
    secretKey: "your-private-secret-key",
  },
});
```

Production requests fail closed while placeholder keys remain. Localhost uses
Cloudflare's official test keys automatically.

### SMTP configuration

The function supports any authenticated SMTP provider. For Gmail or Google
Workspace, enable two-step verification and create an App Password. Do not use
the normal account password.

Edit `functions/mail.config.js`:

```js
module.exports = {
  smtp: {
    host: "smtp.gmail.com",
    port: 465,
    user: "your-account@gmail.com",
    pass: "your-16-character-app-password",
  },
  mail: {
    from: "Golden Horizon <your-account@gmail.com>",
    to: "the-inbox-that-should-receive-bookings@example.com",
  },
};
```

The `from` address must use the authenticated SMTP account or a sender alias
verified with that provider.

The configuration is committed to the repository and deployed with the
function. Anyone who can read the repository can read the SMTP password. Cloud
Functions still requires the Firebase project to use the Blaze billing plan.

## Verification

```bash
npm run build
npm run test:functions
npm audit
npm audit --prefix functions
```

## GitHub deployment

`.github/workflows/firebase-deploy.yml`:

- builds the Vite site
- installs and tests the contact function
- deploys Hosting and Functions on pushes to `main`
- deploys a Hosting preview channel for pull requests

Add these GitHub repository secrets:

- `FIREBASE_PROJECT_ID`: `golden-horizon-band`
- `FIREBASE_SERVICE_ACCOUNT`: the complete Firebase deployment service-account
  JSON document

The deployment service account needs Firebase Hosting Admin and Cloud Functions
Developer. Grant it Service Account User on the Functions runtime and Cloud
Build service accounts; Hosting deployments may also require API Keys Viewer.
A Hosting-only service account is not sufficient.

## Project structure

```text
.
|-- index.html              # scroll-cinematic landing page
|-- index.legacy.html       # previous single-view site (backup, not built)
|-- contact.html
|-- firebase.json
|-- scripts/
|   `-- slice-frames.mjs    # ffmpeg-static frame slicer (npm run slice)
|-- functions/
|   |-- index.js
|   |-- index.test.js
|   |-- mail.config.js
|   |-- package.json
|   |-- security.config.js
|   |-- security.js
|   `-- validation.js
|-- public/
|   |-- favicon.svg
|   |-- logo.jpeg
|   |-- turnstile-config.json
|   |-- media/
|   |   `-- hero-master.mp4 # cinematic hero master clip (fallback)
|   `-- frames/
|       `-- hero/           # scroll-scrubbed JPG sequence + manifest.json
`-- .github/workflows/firebase-deploy.yml
```
