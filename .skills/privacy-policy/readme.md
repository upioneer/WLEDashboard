# Privacy Policy Generator

**Version:** 5
**Target:** `.skills/privacy-policy`

## Description
Generates a customizable privacy policy tailored to the project (website/app) with optional Google Analytics integration.

## Capabilities & Use Cases
* **Interactive Requirement Engineering**: Leverages the native `ask_question` tool to actively prompt the user through a branching, multi-choice interview for policy requirements.
* **Adaptive Legal Templating**: Generates strict, fully compliant privacy policies dynamically tailored to the precise platform constraints (Website, Mobile App, or Hybrid).
* **Automated Third-Party Clause Injection**: Conditionally builds and inserts specialized data collection clauses, including embedded opt-out mechanisms for Google Analytics.
* **Contextual UX Analysis**: Intelligently scans the existing codebase's layout structure and design language to recommend the highest-converting link placements.
* **Omnichannel UI Deployment**: Capable of scaffolding the final policy document into multiple presentation formats, including dedicated Next.js slugs, React modals, or inline scrollable components.

## Usage
This skill automates the creation of a privacy policy for a website or application. When invoked, it will prompt the user with multiple choice questions to gather necessary context (e.g., platform, business/individual, country, effective date, and Google Analytics inclusion).

## Changelog
* **v5** : Expanded capability descriptions
* **v4** : Added Google Analytics opt out extension blurb and embedded link to the GA clause template.
* **v3** : Added instruction clarifying the native write in UI functionality for custom placements/follow ups.
* **v2** : Added AI design language analysis, link placement recommendations, and UI display format options.
* **v1** : Initial creation of the Privacy Policy Generator skill.
