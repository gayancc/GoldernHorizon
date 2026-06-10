# Golden Horizon — Band Landing Page

A modern, animated landing page for **Golden Horizon**, a fictional Toronto-based
musical group. Built with [Vite](https://vitejs.dev),
[GSAP](https://gsap.com) (ScrollTrigger animations) and
[Three.js](https://threejs.org) (animated golden-horizon hero scene), deployed to
Firebase Hosting via GitHub Actions.

## Features

- **Three.js hero** — a golden sun sinking toward a wireframe ocean of animated
  waves with drifting dust particles and pointer parallax
- **GSAP animations** — preloader-to-hero title intro and scroll-triggered
  reveals on the contact page
- **Fully functional contact page** — client-side validation, honeypot
  anti-spam, AJAX submission (no backend needed on static hosting)
- **Mobile-friendly** — responsive grid layouts, full-screen mobile menu,
  `svh` viewport units, capped pixel ratio on the WebGL canvas
- **Accessible & resilient** — `prefers-reduced-motion` support, semantic
  markup, ARIA labels, content remains visible if JavaScript fails

## Local development

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build
```

## Contact form

The form posts to [FormSubmit](https://formsubmit.co) (free, no backend
required). The recipient inbox is set by `FORM_ENDPOINT` in
`src/js/contact.js`:

```js
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/<your-email>';
```

The **first** submission triggers a one-time activation email from FormSubmit
to that address — click the link in it and all subsequent submissions are
delivered straight to the inbox.

## Deployment (Firebase Hosting via GitHub Actions)

`.github/workflows/firebase-deploy.yml` builds the site and:

- deploys to the **live** channel on every push to `main` (and manual runs)
- deploys to a **preview channel** for every pull request (URL is posted as a
  PR comment)

### One-time setup

1. Create a Firebase project and enable Hosting
   (`firebase init hosting` locally, or via the console).
2. Update the project id in `.firebaserc`.
3. Create a service account for deploys:
   `firebase init hosting:github` does this automatically, or create one in
   Google Cloud IAM with the *Firebase Hosting Admin* role and download the
   JSON key.
4. Add two GitHub repository secrets:
   - `FIREBASE_SERVICE_ACCOUNT` — contents of the service-account JSON key
   - `FIREBASE_PROJECT_ID` — your Firebase project id

## Project structure

```
├── index.html                  # landing page
├── contact.html                # contact / booking page
├── public/favicon.svg
├── src/
│   ├── css/style.css           # design system + responsive styles
│   └── js/
│       ├── main.js             # landing page entry (GSAP timelines)
│       ├── contact.js          # contact page entry (form logic)
│       ├── scene.js            # Three.js hero scene
│       └── ui.js               # shared nav + scroll reveals
├── firebase.json               # hosting config (dist/, cache headers)
└── .github/workflows/firebase-deploy.yml
```
