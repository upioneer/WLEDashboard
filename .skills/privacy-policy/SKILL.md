---
name: Privacy Policy Generator
description: Generates a customizable privacy policy tailored to the project (website/app) with optional Google Analytics integration.
---

# Privacy Policy Generator Skill

When this skill is executed, you must generate a tailored Privacy Policy for the user's project by following these steps:

1. **Ask for Requirements**:
   Use your `ask_question` tool to gather the required parameters from the user. Formulate a multiple-choice question with the following parameters:
   
   Question 1: "What is the primary platform for this Privacy Policy?"
   Options: 
   - Website
   - Mobile App
   - Both Website and App

   Question 2: "Are you operating as a Business or an Individual?"
   Options:
   - Business
   - Individual

   Question 3: "Do you want to include a Google Analytics data collection template?"
   Options:
   - Yes, include Google Analytics section
   - No, skip it

   (Note: For the Application/Website Name, Web URL, Country, and Policy Effective Date, prompt the user for text input in your chat message directly, as `ask_question` is best for multiple-choice).

2. **Read the Template**:
   Read the privacy policy template provided in this skill's directory at `templates/privacy_policy.md`.

3. **Substitute Variables**:
   Once the user provides the answers, substitute the following placeholders in the template:
   - `[PLATFORM_TYPE]` -> (e.g., "website", "app", or "website and app")
   - `[APP_WEB_NAME]` -> User's provided name
   - `[URL]` -> User's provided URL
   - `[BUSINESS_TYPE]` -> "Business" or "Individual"
   - `[COUNTRY]` -> User's provided country
   - `[EFFECTIVE_DATE]` -> User's provided date
   - `[GOOGLE_ANALYTICS_SECTION]` -> If yes, insert the following clause: "### Analytics\nWe may use third-party Service Providers such as Google Analytics to monitor and analyze the use of our Service. Google Analytics is a web analytics service offered by Google that tracks and reports website traffic. You can choose to disable Google Analytics tracking across all websites by installing the [Google Analytics browser extension](https://tools.google.com/dlpage/gaoptout)." If no, remove this placeholder entirely.

4. **Analyze Design Language & Recommend Placement**:
   Analyze the codebase's current design language and layout structure (e.g., check the main layout file, footer, or app settings view). Based on your analysis, provide a personalized recommendation in the chat for where the Privacy Policy link should be placed (e.g., "Based on your app's sidebar layout, I recommend placing the link in the footer of the Settings page.").

5. **Prompt for Display Format**:
   Use your `ask_question` tool again to ask the user how they would like the Privacy Policy to be presented in the UI:

   Question: "How would you like to display the Privacy Policy?"
   Options:
   - Dedicated new URL/Slug (e.g., `/privacy`)
   - Pop-up / Modal dialog
   - Integrated within an existing legal/settings page
   - Scrollable inline component

   *(Note: Do not explicitly add an "Other" option. The `ask_question` tool provides a write-in text box by default where the user can specify their own custom placement or follow-up instructions).*

6. **Deploy and Integrate**:
   Based on the user's chosen display format and the recommended placement, write the final privacy policy document and generate the necessary components (e.g., React modal, Next.js page) to integrate it into the project.
