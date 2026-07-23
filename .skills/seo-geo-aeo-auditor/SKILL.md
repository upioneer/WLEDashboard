---
name: seo_geo_aeo_auditor
description: Unified model-agnostic Search Engine, Generative Engine, and Answer Engine Optimization auditor to analyze traditional visibility, AI engine discoverability, and snippet answers.
---

# SEO GEO AEO Auditor Skill

This skill guides the agent through performing comprehensive, model-agnostic audits of websites across the three key dimensions of modern search visibility: traditional SEO, Generative Engine Optimization (GEO), and Answer Engine Optimization (AEO).

## Auditing Pillars

The agent must audit the target site across the following three pillars, evaluating specific criteria in each dimension:

### 1. Traditional SEO (Search Engine Optimization)
This pillar targets visibility on traditional search engines such as Google and Bing, focusing on standard technical parameters, indexability, and clean HTML structures.

* **Metadata Integrity**: Verify title tags (ideal length 50 to 60 characters) and meta descriptions (ideal length 120 to 160 characters). Check for canonical tags, secure HTTPS protocols, and robots.txt indexability directives.
* **Semantic HTML Structure**: Analyze heading hierarchies (H1 to H6). Ensure there is exactly one H1 tag per page. Verify that HTML5 semantic tags (e.g. `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`) are used to partition content logically.
* **Technical Performance**: Evaluate mobile responsiveness, clean URL architectures, page speed indicators, XML sitemap configurations, and core web vitals parameters (Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift).
* **Structured Data Validation**: Scan for rich schema implementations (specifically JSON-LD format) to ensure search crawlers can parse core metadata.

### 2. GEO (Generative Engine Optimization)
This pillar targets visibility within AI-driven search platforms and LLM synthesizers, such as Perplexity, ChatGPT Search, Gemini, and Google AI Overviews. These systems rely on authority validation, semantic networks, and dense factual structuring.

* **E-E-A-T Signaling (Experience, Expertise, Authoritativeness, Trustworthiness)**: Audit author bios, credentials references, and external citations. Verify the presence of professional profiles and clear authorship schemas linked to Wikidata or other authoritative directories.
* **Entity Clarity and Semantic Mapping**: Evaluate how clearly subject-verb-object relationships are defined in the text. Ensure entity references are unambiguous and linked to global knowledge systems (Wikidata/Wikipedia) via structured metadata to help LLMs resolve entities.
* **Fact Density and Factual Validation**: Measure the density of verifiable facts, data statistics, expert quotes, and scientific references within the text. Generative engines prioritize dense, highly informative paragraphs over vague promotional content.
* **Authoritative Citations**: Check for outbound links to primary sources, research reports, academic papers, or leading industry directories. AI platforms prioritize content that provides verifiable, transparent references.

### 3. AEO (Answer Engine Optimization)
This pillar targets instant response features, featured snippets, and voice search systems (such as Alexa, Google Assistant, Siri, and instant LLM answers).

* **Direct Answer Formatting**: Audit how content answers specific queries. Look for question-phrased subheadings (H2 or H3) followed immediately by a direct, highly concise answer in a single `<p>` paragraph block. This structure is optimal for LLM extraction and featured snippet displays.
* **FAQ and HowTo Schema Blocks**: Ensure FAQPage and HowTo JSON-LD schemas are implemented on informational pages to feed quick answer widgets.
* **Conversational Voice Patterns**: Check if the language uses natural conversational patterns that mimic voice search queries rather than stiff technical keywords.

## Audit Workflow and Step-by-Step Execution

The agent must execute the auditing process using the following chronological workflow:

### 1. Parameters and Audit Scope Gathering
* Prompt the user for the target URL.
* Gathers the Audit Depth selection:
  * Quick Audit: Focuses on top visibility issues, scoring, and quick structural fixes.
  * Full Audit: In-depth technical crawl, metadata extraction, semantic analysis, schema verification, and customized content strategies.

### 2. Crawling and Asset Inspection
* Retrieve the HTML content of the target URL using safe scanning utilities (such as Playwright automation).
* Extract all metadata tags, schema structures, heading lists, text bodies, and external resource paths.

### 3. Metric Calculations and Scoring
The agent must calculate performance scores out of 100 for each of the three optimization dimensions based on the following weights:

* **Traditional SEO Score (100 Points)**:
  * Metadata compliance: 30 points.
  * Technical speed and responsiveness: 30 points.
  * Structural HTML layout: 20 points.
  * Basic Schema validation: 20 points.
* **GEO Score (100 Points)**:
  * E-E-A-T and Author credibility signals: 30 points.
  * Entity clarity and semantic syntax mapping: 30 points.
  * Factual density and statistics: 20 points.
  * Outbound authoritative citations: 20 points.
* **AEO Score (100 Points)**:
  * Direct answer paragraph formatting: 40 points.
  * Question-phrased headers: 30 points.
  * FAQ / HowTo Schema implementation: 30 points.

### 4. Prioritized Action Checklist Generation
Compile an actionable list of repairs divided into three distinct severity levels:

* **High Priority**: Immediate structural or technical roadblocks (e.g. missing H1, lack of HTTPS, broken schemas, absent mobile layouts).
* **Medium Priority**: Enhancements targeting discoverability (e.g. writing direct answer blocks, appending E-E-A-T bio credentials, resolving entity ambiguities).
* **Low Priority**: Long-term strategy fixes (e.g. adding sitemaps, expanding factual statistics, implementing detailed Wikidata schema linkages).

### 5. Report Compilation and Formatting
Construct the audit report in a clean, highly readable Markdown format containing the following sections:

* **Executive Summary**: Overview of scores for SEO, GEO, and AEO in a consolidated table format.
* **Prioritized Action Checklist**: Bulleted checklist of actionable repairs using asterisks.
* **Pillar Breakdown**:
  * Detailed traditional SEO analysis (table of headers, meta tag character counts, schema health).
  * Generative Engine (GEO) analysis (entity density, expert quote presence, EEAT authority evaluations).
  * Answer Engine (AEO) analysis (snippet compatibility, direct answer formatting, FAQ schemas).
* **Actionable Repair Examples**: Provide concrete rewriting suggestions for a section of the user's content to demonstrate how to convert a standard promotional block into a dual GEO/AEO optimized paragraph.
