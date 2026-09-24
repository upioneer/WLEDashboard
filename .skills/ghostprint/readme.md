# GhostPrint Engine

**Version:** 4
**Target:** `.skills/ghostprint`
**Category:** Security & Cryptography
**Keywords:** `ghostprint`, `ghost-print`, `code-provenance`, `steganography`, `copyright-protection`, `digital-forensics`, `functional-entanglement`, `anti-tamper`, `zero-knowledge-proof`, `key-ceremony`, `entropy-meter`, `stylometry`, `ast-invariants`, `statistical-distribution`, `remote-oracle`, `daubert-standard`, `courtroom-admissible`, `dmca-evidence`

## Description
GhostPrint Engine is an industrial grade cryptographic code provenance and steganographic entanglement system engineered to protect proprietary software from unauthorized copying, automated AI refactorings, and closed-source SaaS exfiltration. It enables software authors to deterministically and irrefutably prove original authorship of stolen codebases in adversarial court proceedings and DMCA disputes through multi-layer mathematical verification and digital forensics.

## Capabilities & Use Cases
* **Nine Layer Steganographic Defense in Depth**: Implements an adversarial gradient spanning sacrificial honeypot decoys, cryptographic pre-image constants, poly-algorithmic functional entanglement, multi-channel Unicode steganography, linguistic stylometry lexicon binding, abstract syntax tree (AST) topological invariants, soft constant statistical distribution signatures, remote runtime behavioral oracles, and temporal proof anchoring:
  * **Layer 0 (Sacrificial Honeypot Decoy)**: Deliberately visible copyright banners and watermarks placed in obvious configuration files. Functions as a psychological decoy for amateur adversaries and automated scrapers. Once removed, adversaries assume the codebase is sanitized, lowering their guard while eight invisible layers remain fully active.
  * **Layer 1 (Cryptographic Pre-Image Constants)**: Public pseudo-random constants derived from the author root seed that act as legitimate cryptographic salts, hash seeds, or lookup table seeds. Demonstrates mathematical pre-image generation with coincidence probability p < 2^-128.
  * **Layer 2 (Poly-Algorithmic Functional Entanglement)**: Cryptographic watermark constants interwoven directly into mission-critical runtime algorithms (spatial 3D camera jitter vectors, perceptual cubic-bezier easing curves, cache ring distribution offsets, and exponential backoff timers). Tampering with or stripping these constants destabilizes runtime execution or causes subtle operational degradation.
  * **Layer 3 (Multi-Channel Unicode & Whitespace Steganography)**: Invisible zero-width character streams (U+200B, U+200C, U+200D), homoglyphic lexical mappings, and trailing whitespace bit-encoding embedded across documentation, template literals, and code comments, providing instantaneous verification even in raw text diffs.
  * **Layer 4 (Linguistic Stylometry & Lexicon Binding)**: Subtly structured syntactic phrasing, distinctive code commentary idioms, and deterministic identifier naming cadences derived from author linguistic profiles, confirming authorship via computational stylometry and NLP.
  * **Layer 5 (AST Topological Invariants)**: Fingerprinted abstract syntax tree structural invariants, cyclic dependency node counts, and deterministic branching geometries that remain completely invariant across automated code formatters, variable renamers, and AST transpilers.
  * **Layer 6 (Soft Constant Statistical Distribution Signatures)**: Seeds 40 or more soft discretionary constants (timeouts, debounce intervals, buffer chunk thresholds, batch sizes, retry multipliers) with pseudo-random floats whose collective joint probability distribution yields astronomical uniqueness (coincidence probability p < 10^-50), surviving complete variable renamings and AI refactorings.
  * **Layer 7 (Remote Black-Box Behavioral Oracles)**: Covert operational side-channels embedded into public HTTP interfaces, response header metadata, sub-millisecond network timing jitter, precision floating-point delta curves, and synthetic edge-case error responses, enabling authors to audit and prove theft in closed SaaS backends without requiring source code access.
  * **Layer 8 (Temporal Proof & Public Ledger Anchoring)**: Cryptographic anchoring of Git tree SHAs, RFC-3161 trusted timestamping authorities, and public commit trees establishing definitive legal priority of creation prior to the infringing party creation date.
* **Kerckhoffs Steganographic Invariant**: Engineered according to Kerckhoffs principle so that even an adversary or automated AI agent possessing the full GhostPrint engine source code cannot detect, isolate, or sanitize all embedded fingerprints without possessing the author private root passphrase.
* **Hierarchical Deterministic (HD) Ratchet Key Tree**: Single sovereign master root passphrase (12 to 24 words) deterministically derives distinct, polymorphic layer constants for every project release version via HKDF-SHA256, eliminating key sprawl and preserving permanent historical auditability across all past and future releases.
* **Spectral Cyan Key Ceremony**: Interactive terminal user interface featuring real-time dynamic entropy calculation, live animated progress meters, and selectable security profiles up to 24 words benchmarked against hardware supercomputer compute times and cosmic universe lifespans:
  * 9 Words (99-bit): 20 Million Years (1,500 × all of recorded human history).
  * 12 Words (128-bit): 17 Sextillion Years (1.2 Trillion × the age of the universe).
  * 15 Words (160-bit): 140 Nonillion Years (100 Quintillion × the age of the universe: fully resistant to quantum Grover search).
  * 18 Words (192-bit): 1.2 Undecillion Years (80 Nonillion × the age of the universe).
  * 21 Words (224-bit): 10 Tredecillion Years (700 Undecillion × the age of the universe).
  * 24 Words (256-bit): 93 Quindecillion Years (Effectively infinite: exceeds the estimated heat death of the cosmos).
* **Cryptographic Wordlist Optimization**: Built upon a standardized 2,048-word lexicon where every word is uniquely identifiable by its first four letters, contains zero homophones or visually ambiguous lookalikes, and provides optimal Hamming distance for human error detection and transcription reliability (11 bits of entropy per word).
* **Anti-Correlation Policy Gatekeeper**: Audits repository metadata in real time (git configuration, remote URLs, package names, author handles, directory names) and enforces a mandatory 75% external dictionary word threshold, actively blocking authors from establishing vulnerable keys composed of public project terms and defeating targeted dictionary attacks.
* **Automated README Badge Generation**: Automatically asserts a Shields.io [GhostPrint Protected] badge directly beneath the primary repository header in README.md upon project protection, with dedicated CLI inspection and manual opt-out support (--no-badge).
* **Project-Segmented Vault Topology**: Automatically segments credentials into isolated project vaults (`~/.ghostprint/projects/<slug>.vault.json.enc`) protected by authenticated AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations), ensuring client and personal repositories remain completely segregated with zero cross-contamination.
* **Universal Git Slug Auto-Routing**: Automatically inspects git remote origin URLs and resolves them into canonical filesystem slugs (e.g. `organization-project-slug`, `core-infrastructure-repo`), enabling seamless single-command vault access and contextual configuration.
* **Master Portfolio Key Reuse**: Allows authors to use a single 24-word sovereign master passphrase across 50 independent repositories while HKDF automatically derives 100% uncorrelated layer constants for each project using repository URLs as cryptographic salt, guaranteeing that the compromise of one repository yields zero knowledge about any other codebase.
* **Project Registry Dashboard**: Centralized management command (`ghostprint list`) displaying all enrolled repositories, their canonical slugs, vault encryption statuses, sealed release versions, and active protection layers in an intuitive CLI dashboard.
* **Forensic Repository Auditor (`ghostprint-audit.js`)**: Deep inspection engine that scans suspect repositories, evaluates AST tree isomorphism, calculates statistical Hamming distance, analyzes token n-grams, and computes joint p-values (p < 10^-45) providing irrefutable mathematical proof of code theft.
* **Court Admissible Digital Forensics Dossier (`ghostprint-export.js`)**: Automatically generates sealed forensic evidence reports (Markdown, PDF, and machine-verifiable JSON formats) detailing derivation trees, AST coordinate mapping, statistical impossibility proofs exceeding the federal Daubert standard, and independent sandbox reproduction scripts for judicial expert examiners.
* **Remote Black-Box Oracle Probing (`ghostprint-oracle.js`)**: Audits closed-source cloud deployments and private SaaS applications over public HTTP interfaces via timing jitter analysis, synthetic edge-case error message capture, and numerical rendering delta checks without requiring source code access.
* **Authoritative Architectural Contract Card**: Interactive specification card presenting the ASCII branding banner, CLI installation syntax, programmatic import code, YAML frontmatter schemas, domain constraints, and security permissions on code-scaffold.com.
* **Natural Language Intent Engine**: Provides conversational CLI dispatch allowing developers and AI agents to invoke commands naturally (e.g. `ghostprint "list my registered projects"`, `ghostprint "audit ../competitor-app"`, `ghostprint "probe https://suspect-site.com"`).
* **Multi-Domain Entanglement Archetypes**: Production-ready reference patterns across six core domains: State and Cache Mechanics, Spatial and 3D Engines, Scientific and Color Science, Networking and Rate Limiting, UI and Animation Design Systems, and Data/ML Pipelines.
* **Zero External Dependencies**: Operates 100% offline across Windows, macOS, and Linux using the native Node.js standard runtime and built-in crypto module with zero npm package requirements.

## Usage
AI agents and developers invoke the GhostPrint Engine via conversational natural language commands or structured CLI flags:

* Interactive Setup & Key Ceremony: `node .skills/ghostprint/scripts/ghostprint.js init` or `ghostprint "generate a new 15-word passphrase for this repo"`
* Assert Shields.io README Protection Badge: `node .skills/ghostprint/scripts/ghostprint.js badge` or `ghostprint "add ghostprint badge to readme"`
* Project Registry Dashboard: `node .skills/ghostprint/scripts/ghostprint.js list` or `ghostprint "list my registered projects"`
* Key Rotation with Epoch Succession: `node .skills/ghostprint/scripts/ghostprint.js rotate` or `ghostprint "rotate master key but preserve old releases"`
* Multi-Layer Repository Infringement Audit: `node .skills/ghostprint/scripts/ghostprint.js audit --target /path/to/suspect-repo`
* Remote Cloud SaaS Oracle Probe: `node .skills/ghostprint/scripts/ghostprint.js probe --url https://suspect-saas.com`
* Sealed Legal Dossier Generation: `node .skills/ghostprint/scripts/ghostprint.js export --target /path/to/suspect-repo --format all`

## Changelog
* **v4** : Added automatic GhostPrint README badge generation on project protection with dedicated CLI inspection and manual opt-out support.
* **v3** : Standardized hasSandbox to false to mount the clean Architectural Contract card on code-scaffold.com.
* **v2** : Corrected box-drawing table column alignment for Layer 0 steganographic gradient in SKILL.md.
* **v1** : Initial release of the GhostPrint Engine featuring the 9-layer steganographic defense-in-depth architecture, Hierarchical Deterministic (HD) Ratchet Key Tree, interactive Spectral Cyan Key Ceremony with real-time entropy progress bar, Anti-Correlation Gatekeeper, Project-Segmented Vault Topology, Forensic Infringement Auditor, Remote Black-Box Oracle Probes, and court-admissible legal dossier generator.
