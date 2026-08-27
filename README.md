# Real Is Rare Invoice Studio

A private Next.js invoice workspace with local draft autosaving and immutable finalized-invoice history backed by Firebase Authentication and Cloud Firestore. PDFs are generated on demand in the browser and downloaded directly to the device; no PDF files are stored in Firebase.

## Firebase project setup

1. In the existing Firebase project, register a Web app and enable **Authentication > Email/Password**.
2. Create the single authorized user manually in Authentication. Do not add a public signup flow.
3. Create the default Cloud Firestore database in production mode.
4. Enable email-enumeration protection for the project.
5. Create a server service account for the deployed Next.js application and grant only the Firestore permissions it needs.
6. Copy `.env.example` to `.env.local` and fill in the Web app values, service-account values, and authorized user UID.
7. Deploy the locked Firestore rules and indexes with `npx firebase deploy --only firestore` from an authenticated Firebase CLI session.

Keep `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `ALLOWED_FIREBASE_UID` server-only. Never prefix them with `NEXT_PUBLIC_` or commit `.env.local`.

## Development

```bash
npm run dev
```

The Firebase Emulator Suite can be started without touching the live project:

```bash
npm run emulators
```

The Auth emulator uses port `9099`, Firestore `8080`, and the Emulator UI `4000`. Point the app at those emulators only in local development; never configure emulator host variables in production.

The current Firebase CLI requires JDK 21 or newer for the Firestore emulator.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run test:firebase
npm run test:e2e
npm run build
```

`test:firebase` starts an isolated Firestore emulator and verifies that browser clients cannot access it. The application uses Firebase Admin on the server after checking the authorized session.

## Data behavior

- Editable drafts stay in browser `localStorage`.
- Finalizing saves a validated invoice, seller profile snapshot, total, and PDF template version to Firestore.
- PDFs are regenerated from the stored snapshot and downloaded directly to the device.
- Finalized invoice numbers are unique per authorized user.
- Finalized history has no update or delete endpoint.
