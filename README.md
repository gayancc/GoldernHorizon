# Golden Horizon

Golden Horizon is a Vite landing page for a Toronto live band playing private
parties, pubs, and bars. Firebase Hosting serves the site and a second-generation
Firebase HTTPS function sends booking emails.

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
that path to the `contact` function in `northamerica-northeast1`.

The function:

- validates and limits all fields server-side
- accepts only party and pub/bar booking types
- uses a honeypot and short per-instance rate limit
- emails the private booking inbox
- sends the customer a confirmation with a booking reference
- never exposes SMTP credentials or the recipient inbox to the browser

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
|-- index.html
|-- contact.html
|-- firebase.json
|-- functions/
|   |-- index.js
|   |-- index.test.js
|   |-- mail.config.js
|   |-- package.json
|   `-- validation.js
|-- public/
|   |-- favicon.svg
|   `-- logo.jpeg
`-- .github/workflows/firebase-deploy.yml
```
