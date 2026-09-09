---
description: Firebase Project Setup Template
---

# Firebase Project Configuration

## Project Details
* **Project ID:** [YOUR_PROJECT_ID]
* **Hosting Site ID:** (Optional - Defaults to Project ID if there's only one site)
* **Region:** (Optional - Defaults to your Firebase project's default region, typically us-central1)

## Agent Instructions
When an agent sees this file:
1. Verify Firebase CLI is installed and authenticated (`firebase login`). Prompt user if not.
2. Verify the `firebase.json` configuration matches the intended Hosting setup.
3. Build the application (`npm run build`).
4. Execute `firebase deploy --only hosting` (or appropriate command).
5. Document the deployment status and update any relevant deployment logs.

