# Firebase

**Version:** 3
**Target:** `.skills/firebase`

## Description
Firebase authentication and database connectivity

## Capabilities & Use Cases
* Provides deep architectural integration and secure SDK initialization protocols for Firebase deployments.
* Enforces email and password authentication defaults and guarantees route protection for authenticated application views.
* Strategically selects database paradigms, allocating Cloud Firestore for complex relational queries and Realtime Database for low-latency synchronization.
* Intelligently optimizes data modeling by denormalizing structures to mitigate NoSQL read limits.
* Executes proactive limit verification checks against Firebase Spark Plan boundaries before allowing mutating deployments.
* Intercepts deployment commands to validate CLI existence, login statuses, and enforces strict `.env` / `firebase.md` credentials availability.
* Automates CI/CD updates by logging successful deployment configurations back into project documentation artifacts.
* Enforces strict version control documentation artifacts using standard semantic versioning and screenshot generation for UI modifications.

## Usage
This skill is built for the Code Scaffold engine. Please refer to the `SKILL.md` file inside this directory for the deep integration guidelines and agentic methodologies.

## Changelog
* **v3** : Expanded capability descriptions
* **v2** : Register repository skills and enforce firebase cli validation
* **v1** : Update firebase and github skill configurations
