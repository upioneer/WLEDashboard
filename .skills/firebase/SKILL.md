name: firebase_deployment
description: Specialized skill for safely pushing to Firebase, verifying firebase.md configuration, and updating it upon success.

# Firebase Deployment Skill & Workflow

When the user asks to push or deploy to Firebase, follow these instructions exactly to ensure a safe, documented deployment.

## Agent Directives for Integration and Architecture

As an AI coding agent building or expanding this project, you must adhere to the following technical constraints when integrating Firebase services.

1. SDK Initialization
Initialize the Firebase application securely. You must never expose private keys or raw service account credentials in client code. Use environment variables for all configuration objects.

2. Authentication Protocols
Default to Email and Password authentication unless the user explicitly requests otherwise. Manage user sessions securely across the application and ensure route protection is enforced on all authenticated views.

3. Database Paradigms
You must evaluate the data structure before selecting a database. Use Cloud Firestore for complex relational data that requires advanced querying. Use the legacy Realtime Database only for simple JSON trees that require low latency state synchronization.

4. Data Modeling
Structure collections and documents to optimize for NoSQL read limits. Denormalize data where appropriate to avoid multiple round trips.

## Agent Directives for Limit Verification

You must verify the project architecture and anticipated usage against the Firebase Spark Plan limits before executing any deployment commands. If the projected usage exceeds these limits, you must warn the user and halt deployment until authorized.

* Authentication: 10k per month for Phone and Unlimited for Email or Social
* Cloud Firestore: 1 GB storage and 50k reads per day
* Realtime Database: 1 GB storage and 100 concurrent connections
* Cloud Storage: 5 GB storage and 1 GB download per day
* Hosting: 10 GB storage and 360 MB transfer per day
* Cloud Messaging: Unlimited and Free

## Deployment Steps

0. CRITICAL: Installation and Login Validation
To prevent confusion and delivery delays, **you must ensure the CLI is installed and logged in before attempting to push or deploy**.
- Check if `firebase` is installed (`firebase --version`). If it fails, install it via NPM (`npm install -g firebase-tools`) or standalone binary.
- Check login status (`firebase projects:list`). If the command succeeds, the user is authenticated. If it returns an authentication error or prompts to log in, you **MUST** instruct the user to run `firebase login`.
- Pause execution and wait for the user to confirm they have logged in successfully before proceeding.

1. Verify firebase.md
Read the firebase.md file in the project root workspace to ensure it contains all necessary Firebase configuration and deployment information.

2. Prompt the User if Missing Info
If firebase.md does not exist or lacks necessary deployment details, immediately halt and ask the user directly for the missing Firebase configuration information. Do not proceed to deployment until this information is provided.

3. Perform the Push or Deploy
Once the necessary information and limit checks are confirmed, run the appropriate Firebase deployment commands.

4. Verify the Deployment
Test the deployed environment or check the output of the terminal command or Firebase console URL to ensure a successful push.

5. Update Documentation
After a successful deployment, automatically update firebase.md (or create it if it does not exist) with any new or confirmed project configuration details, URLs, or parameters so it is available for future automated deployments.

6. **Generate Versioned Walkthrough**
* You MUST update the `[PROJECT_ROOT]\project_details\changelog\[VERSION]` directory on each iteration of the app using standard semantic versioning (Major.Minor.Bugfix, e.g., v1.1.0).
* Ensure that walkthrough documentation includes screenshots where possible, especially to document UI changes.
* Never modify or overwrite existing version documentation once established
* Ensure each significant deployment cycle results in a new immutable artifact folder
* Always ensure that the listed skills within the project's `readme.md` are alphabetized when generating or updating the documentation
