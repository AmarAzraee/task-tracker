Setup & deploy instructions for Cloud Functions

1) Install dependencies

   cd functions
   npm install

2) Set SendGrid config (one-time)

   firebase functions:config:set sendgrid.key="YOUR_SENDGRID_KEY" sendgrid.from="no-reply@yourdomain.com"

3) Local emulator (optional)

   # Start functions emulator
   npm run serve

   # Get ID token from your app (in browser dev console):
   firebase.auth().currentUser.getIdToken().then(t => console.log(t))

   # Example local test (replace <TOKEN>):
   curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
     -d '{"email":"staff@example.com","name":"Staff","taskTitle":"Do thing"}' \
     http://localhost:5001/<YOUR_PROJECT>/us-central1/sendReminder

4) Deploy to Firebase

   firebase deploy --only functions

Notes
- The scheduled function `sendOverdueReminders` runs every 24 hours and sends reminders for overdue tasks (it depends on `assignedEmail`/`assignedName` fields on tasks). Update your task documents to include these fields when creating tasks (the Admin UI now saves `assignedEmail`/`assignedName` automatically).
- **Important:** Cloud Scheduler / scheduled functions require a Blaze (pay-as-you-go) plan and billing enabled. If you cannot enable billing, run the scheduled job manually in the emulator or via a manual HTTP trigger.
- Ensure you set SendGrid config and proper IAM permissions before deploying to production.

GitHub Actions (CI) setup

1) Create the following GitHub Secrets in your repository settings:
   - `FIREBASE_TOKEN` (create via `firebase login:ci` and copy the token)
   - `FIREBASE_PROJECT_ID` (your Firebase project id, e.g., `task-tracker-auth-amar`)
   - `SENDGRID_KEY` (your SendGrid API Key)
   - `SENDGRID_FROM` (the verified from email address, e.g., `no-reply@yourdomain.com`)

2) The repository contains a workflow at `.github/workflows/deploy-functions.yml` which will:
   - install dependencies
   - set functions config (SendGrid) using provided secrets
   - deploy Cloud Functions on push to `main`

3) To test locally before pushing, use the Functions emulator:
   - cd functions && npm install
   - npm run serve
   - Use a browser-signed-in ID token to call the local endpoint or use curl (see examples above).

Security notes:
- Do not commit API keys to the repository. Use GitHub Secrets to store sensible values.
- Rotate `FIREBASE_TOKEN` periodically and delete tokens when no longer needed.
