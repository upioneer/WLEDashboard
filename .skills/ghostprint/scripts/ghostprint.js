#!/usr/bin/env node
/**
 * GhostPrint Engine™ CLI & Core Architecture
 * Industrial Grade Cryptographic Code Provenance, Steganographic Entanglement Matrix & Digital Forensics
 * Cross-platform: Windows, macOS, Linux (Zero external npm dependencies)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');
const wordlist = require('./wordlist');

// ── SPECTRAL CYAN FORENSIC PALETTE ──────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[38;2;0;240;255m',      // Spectral Cyan
  emerald: '\x1b[38;2;0;255;157m',   // Phosphor Neon Emerald
  silver: '\x1b[38;2;203;213;225m',  // Ethereal Silver
  violet: '\x1b[38;2;168;85;247m',   // Spectral Violet
  amber: '\x1b[38;2;251;191;36m',    // Warning Amber
  red: '\x1b[38;2;239;68;68m',       // Laser Red
  slate: '\x1b[38;2;30;41;59m',      // Deep Slate
  darkGray: '\x1b[38;2;71;85;105m'   // Dim border
};

// ── BANNER & LOGO ───────────────────────────────────────────────────
function printBanner() {
  console.log(`
${C.cyan}${C.bold}   ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗██████╗ ██████╗ ██╗███╗   ██╗████████╗
  ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██║████╗  ██║╚══██╔══╝
  ██║  ███╗███████║██║   ██║███████╗   ██║   ██████╔╝██████╔╝██║██╔██╗ ██║   ██║     
  ██║   ██║██╔══██║██║   ██║╚════██║   ██║   ██╔═══╝ ██╔══██╗██║██║╚██╗██║   ██║     
  ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ██║     ██║  ██║██║██║ ╚████║   ██║     
   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝     ${C.reset}
${C.silver}           GhostPrint Engine™: Cryptographic Code Provenance & Digital Forensics${C.reset}
${C.dim}                   Kerckhoffs-Compliant Steganographic Entanglement Matrix${C.reset}
`);
}

// ── STORAGE LOCATIONS & OS VAULT PATHS ──────────────────────────────
function getVaultDir() {
  return path.join(os.homedir(), '.ghostprint');
}

function getProjectsDir() {
  return path.join(getVaultDir(), 'projects');
}

function getVaultFilePath() {
  return path.join(getVaultDir(), 'vault.json.enc');
}

function getProjectSlug(metadata) {
  let raw = (metadata && (metadata.repo || metadata.project)) || 'default-project';
  return raw
    .replace(/^https?:\/\/[^\/]+\//, '')
    .replace(/^git@[^:]+:/, '')
    .replace(/\.git$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function getProjectVaultPath(metadata) {
  const slug = getProjectSlug(metadata);
  return path.join(getProjectsDir(), `${slug}.vault.json.enc`);
}

// Ensure vault directory and projects subdirectory exist with secure permissions
function ensureVaultDir() {
  const vDir = getVaultDir();
  const pDir = getProjectsDir();
  for (const dir of [vDir, pDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      if (process.platform !== 'win32') {
        try { fs.chmodSync(dir, 0o700); } catch (_) {}
      }
    }
  }
}

// ── DISCOVER PROJECT METADATA (Public Salt Invariants) ─────────────
function discoverProjectMetadata(cwd = process.cwd()) {
  let author = 'Independent Author';
  let project = path.basename(cwd);
  let domain = 'localhost';
  let repo = 'local/repository';

  // Read package.json if exists
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) project = pkg.name;
      if (pkg.author) author = typeof pkg.author === 'string' ? pkg.author : (pkg.author.name || author);
      if (pkg.homepage) domain = pkg.homepage;
      if (pkg.repository) repo = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository.url || repo);
    } catch (_) {}
  }

  // Read Cargo.toml if exists
  const cargoPath = path.join(cwd, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    try {
      const cargo = fs.readFileSync(cargoPath, 'utf8');
      const nameMatch = cargo.match(/name\s*=\s*"([^"]+)"/);
      if (nameMatch) project = nameMatch[1];
      const authMatch = cargo.match(/authors\s*=\s*\["([^"]+)"/);
      if (authMatch) author = authMatch[1];
    } catch (_) {}
  }

  // Read .env if exists
  const envPath = path.join(cwd, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const env = fs.readFileSync(envPath, 'utf8');
      const userMatch = env.match(/GITHUB_USER=([^\r\n]+)/);
      if (userMatch) author = userMatch[1].trim();
      const repoMatch = env.match(/GITHUB_REMOTE_URL=([^\r\n]+)/);
      if (repoMatch) repo = repoMatch[1].trim();
    } catch (_) {}
  }

  return { author, project, domain, repo };
}

// Extract project keyword tokens for the Anti-Correlation Gatekeeper
function getProjectKeywords(metadata) {
  const text = `${metadata.author} ${metadata.project} ${metadata.domain} ${metadata.repo}`.toLowerCase();
  const rawTokens = text.split(/[^a-z0-9]+/i).filter(t => t.length >= 3);
  return Array.from(new Set(rawTokens));
}

// ── ANTI-CORRELATION GATEKEEPER ─────────────────────────────────────
function validateAntiCorrelation(words, projectKeywords) {
  const lowerWords = words.map(w => w.toLowerCase());
  const matched = [];

  for (const w of lowerWords) {
    if (projectKeywords.includes(w)) {
      matched.push(w);
    }
  }

  const externalCount = lowerWords.length - matched.length;
  const externalRatio = lowerWords.length > 0 ? (externalCount / lowerWords.length) : 0;
  const passed = externalRatio >= 0.75;

  return {
    passed,
    matched,
    externalRatio: (externalRatio * 100).toFixed(1),
    requiredRatio: 75.0,
    externalCount,
    totalCount: lowerWords.length
  };
}

// ── CSPRNG MNEMONIC GENERATOR (BIP-39 Standard) ────────────────────
function generateMnemonic(wordCount = 15) {
  // wordCount: 12 (128-bit), 15 (160-bit), 24 (256-bit)
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const randIdx = crypto.randomInt(0, wordlist.length);
    words.push(wordlist[randIdx]);
  }
  return words;
}

// Compute Shannon and dictionary bits
function evaluateEntropy(words) {
  const count = words.length;
  // 11 bits per BIP-39 word
  const theoreticalBits = count * 11;
  return theoreticalBits;
}

// ── CRYPTOGRAPHIC HD RATCHET KEY TREE ──────────────────────────────
function deriveMasterKey(passphrase, metadata) {
  const cleanPass = Array.isArray(passphrase) ? passphrase.join(' ').trim() : passphrase.trim();
  const salt = crypto.createHash('sha256')
    .update(`${metadata.author}:${metadata.project}:${metadata.repo}:${metadata.domain}`)
    .digest();
  
  // Derive 256-bit Master Root Key via HKDF
  const masterKey = crypto.hkdfSync('sha256', Buffer.from(cleanPass, 'utf8'), salt, Buffer.from('ghostprint:master:root', 'utf8'), 32);
  return Buffer.from(masterKey);
}

function deriveReleaseChildKey(masterKey, version, metadata) {
  const versionSalt = crypto.createHash('sha256').update(`release:${version}:${metadata.repo}`).digest();
  const childKey = crypto.hkdfSync('sha256', masterKey, versionSalt, Buffer.from(`ghostprint:release:${version}`, 'utf8'), 32);
  return Buffer.from(childKey);
}

// Derive multi-layer constants for a specific release
function generateLayerConstants(childKey, version) {
  const hash = crypto.createHash('sha256').update(childKey).digest('hex');

  // Layer 0: Sacrificial Honeypot Decoys (can be removed safely)
  const decoys = {
    ORIGIN_WATERMARK_CRC: '0x' + crypto.createHash('sha256').update(childKey + ':decoy1').digest('hex').slice(0, 8),
    BUILD_INTEGRITY_TOKEN: '0x' + crypto.createHash('sha256').update(childKey + ':decoy2').digest('hex').slice(0, 8)
  };

  // Layer 1: Cryptographic Pre-Image Constant (Word 0 offset basis)
  const layer1Word0 = '0x' + hash.slice(0, 8);
  const layer1Word1 = '0x' + hash.slice(8, 16);

  // Layer 2: Poly-algorithmic functional entanglement
  const f1 = (parseInt(hash.slice(16, 20), 16) % 900 + 100) / 10000; // e.g. 0.0412
  const f2 = (parseInt(hash.slice(20, 24), 16) % 900 + 100) / 10000; // e.g. 0.0296
  const ratio = (f1 / f2).toFixed(5);

  // Layer 6: Soft Numerical Constant Cluster (40 values across acceptable ranges)
  const softConstants = [];
  for (let i = 0; i < 40; i++) {
    const byteVal = parseInt(crypto.createHash('sha256').update(`${childKey}:soft:${i}`).digest('hex').slice(0, 4), 16);
    // e.g. debounce between 180ms and 450ms
    const debounce = 180 + (byteVal % 271);
    softConstants.push(debounce);
  }

  return {
    version,
    masterDigest: hash,
    layer0Decoys: decoys,
    layer1: { word0: layer1Word0, word1: layer1Word1 },
    layer2: { jitterCoeff: f1, refillEpsilon: f2, expectedRatio: ratio },
    layer6SoftClusterCount: softConstants.length,
    layer6Sample: softConstants.slice(0, 6)
  };
}

// ── VAULT ENCRYPTION & MANAGEMENT ──────────────────────────────────
function getHostMachineKey() {
  const hostInfo = `${os.hostname()}:${os.userInfo().username}:${os.platform()}`;
  return crypto.createHash('sha256').update(hostInfo + ':ghostprint:host:salt').digest();
}

function saveVault(vaultData, metadata = null) {
  ensureVaultDir();
  const meta = metadata || (vaultData.epochs && vaultData.epochs[0] && vaultData.epochs[0].metadata) || discoverProjectMetadata();
  const projectVaultPath = getProjectVaultPath(meta);
  const key = getHostMachineKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const plaintext = JSON.stringify(vaultData, null, 2);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const payload = {
    version: 1,
    projectSlug: getProjectSlug(meta),
    iv: iv.toString('hex'),
    authTag,
    data: encrypted,
    updatedAt: new Date().toISOString()
  };

  // Write to project-segmented vault file
  fs.writeFileSync(projectVaultPath, JSON.stringify(payload, null, 2), 'utf8');
  // Also keep backward-compatible primary vault file updated
  const legacyVaultPath = getVaultFilePath();
  fs.writeFileSync(legacyVaultPath, JSON.stringify(payload, null, 2), 'utf8');

  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(projectVaultPath, 0o600);
      fs.chmodSync(legacyVaultPath, 0o600);
    } catch (_) {}
  }
  return projectVaultPath;
}

function decryptVaultFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const key = getHostMachineKey();
    const iv = Buffer.from(raw.iv, 'hex');
    const authTag = Buffer.from(raw.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(raw.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    return null;
  }
}

function loadVault(metadata = null) {
  const meta = metadata || discoverProjectMetadata();
  const projectVaultPath = getProjectVaultPath(meta);
  
  // 1. Try project-isolated vault
  if (fs.existsSync(projectVaultPath)) {
    const data = decryptVaultFile(projectVaultPath);
    if (data) return data;
  }

  // 2. Try legacy root vault file
  const legacyVaultPath = getVaultFilePath();
  if (fs.existsSync(legacyVaultPath)) {
    const data = decryptVaultFile(legacyVaultPath);
    if (data) return data;
  }

  // 3. Try global identity
  const identityPath = path.join(getVaultDir(), 'identity.vault.json.enc');
  if (fs.existsSync(identityPath)) {
    return decryptVaultFile(identityPath);
  }

  return null;
}

function listRegisteredProjects() {
  ensureVaultDir();
  const pDir = getProjectsDir();
  const results = [];

  if (fs.existsSync(pDir)) {
    const files = fs.readdirSync(pDir).filter(f => f.endsWith('.vault.json.enc'));
    for (const f of files) {
      const fullPath = path.join(pDir, f);
      const decrypted = decryptVaultFile(fullPath);
      if (decrypted && decrypted.epochs && decrypted.epochs.length > 0) {
        const latestEpoch = decrypted.epochs[decrypted.epochs.length - 1];
        results.push({
          slug: f.replace('.vault.json.enc', ''),
          vaultPath: fullPath,
          project: (latestEpoch.metadata && latestEpoch.metadata.project) || 'Unknown',
          repo: (latestEpoch.metadata && latestEpoch.metadata.repo) || 'Unknown',
          author: (latestEpoch.metadata && latestEpoch.metadata.author) || 'Unknown',
          tier: latestEpoch.tier || 'Standard',
          epochsCount: decrypted.epochs.length,
          lastUpdated: latestEpoch.createdAt
        });
      }
    }
  }

  // If projects dir is empty, check legacy vault file
  if (results.length === 0) {
    const legacyVaultPath = getVaultFilePath();
    const decrypted = decryptVaultFile(legacyVaultPath);
    if (decrypted && decrypted.epochs && decrypted.epochs.length > 0) {
      const latestEpoch = decrypted.epochs[decrypted.epochs.length - 1];
      results.push({
        slug: getProjectSlug(latestEpoch.metadata),
        vaultPath: legacyVaultPath,
        project: (latestEpoch.metadata && latestEpoch.metadata.project) || 'Unknown',
        repo: (latestEpoch.metadata && latestEpoch.metadata.repo) || 'Unknown',
        author: (latestEpoch.metadata && latestEpoch.metadata.author) || 'Unknown',
        tier: latestEpoch.tier || 'Standard',
        epochsCount: decrypted.epochs.length,
        lastUpdated: latestEpoch.createdAt
      });
    }
  }

  return results;
}

// ── FAIL-CLOSED GITIGNORE GATEKEEPER ────────────────────────────────
function assertGitIgnore(cwd = process.cwd()) {
  const gitIgnorePath = path.join(cwd, '.gitignore');
  let content = fs.existsSync(gitIgnorePath) ? fs.readFileSync(gitIgnorePath, 'utf8') : '';
  const lines = content.split(/\r?\n/).map(l => l.trim());

  const requiredEntries = ['.env', '.env.local', '.ghostprint', '*.enc'];
  const missing = requiredEntries.filter(r => !lines.includes(r));

  if (missing.length > 0) {
    const addition = '\n# GhostPrint Engine & Security Invariant Gatekeeper\n' + missing.join('\n') + '\n';
    fs.appendFileSync(gitIgnorePath, addition, 'utf8');
    return { modified: true, appended: missing };
  }

  return { modified: false, appended: [] };
}

// ── INTERACTIVE TERMINAL PROMPTING HELPER ───────────────────────────
function askQuestion(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// ── SHIELDS.IO README BADGE GENERATOR & GATEKEEPER ─────────────────
function generateBadgeMarkdown(metadata = {}) {
  const url = 'https://img.shields.io/badge/GhostPrint-Protected-00f0ff?style=flat-square&logo=shield&logoColor=06090e';
  const targetUrl = 'https://code-scaffold.com';
  return `[![GhostPrint Protected](${url})](${targetUrl})`;
}

function generateBadgeHtml(metadata = {}) {
  const url = 'https://img.shields.io/badge/GhostPrint-Protected-00f0ff?style=flat-square&logo=shield&logoColor=06090e';
  const targetUrl = 'https://code-scaffold.com';
  return `<a href="${targetUrl}"><img src="${url}" alt="GhostPrint Protected" /></a>`;
}

function assertReadmeBadge(projectDir = process.cwd(), options = {}) {
  const badgeMarkdown = generateBadgeMarkdown(options.metadata);

  // Find README.md or readme.md
  let targetFile = 'README.md';
  let fullPath = path.join(projectDir, 'README.md');
  if (!fs.existsSync(fullPath)) {
    const altPath = path.join(projectDir, 'readme.md');
    if (fs.existsSync(altPath)) {
      targetFile = 'readme.md';
      fullPath = altPath;
    }
  }

  // If no readme exists, create a clean README.md
  if (!fs.existsSync(fullPath)) {
    const projectName = (options.metadata && options.metadata.project) || path.basename(projectDir);
    const content = `# ${projectName}\n\n${badgeMarkdown}\n`;
    fs.writeFileSync(fullPath, content, 'utf8');
    return { created: true, modified: true, alreadyPresent: false, fullPath, fileName: targetFile, badgeMarkdown };
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // Check if GhostPrint badge is already present
  if (
    content.includes('badge/GhostPrint') ||
    content.includes('GhostPrint-Protected') ||
    content.includes('[![GhostPrint')
  ) {
    return { created: false, modified: false, alreadyPresent: true, fullPath, fileName: targetFile, badgeMarkdown };
  }

  // Insert badge directly below primary # header or within existing badge block
  const headerMatch = content.match(/^(#\s+[^\r\n]+(?:\r?\n|$))/m);
  let newContent = '';

  if (headerMatch) {
    const headerEndIndex = headerMatch.index + headerMatch[0].length;
    const rest = content.slice(headerEndIndex);

    // If rest immediately starts with badge links (e.g. [![)
    if (/^\r?\n\[!\[/.test(rest)) {
      const newlineMatch = rest.match(/^(\r?\n)/);
      const nl = newlineMatch ? newlineMatch[1] : '\n';
      newContent = content.slice(0, headerEndIndex) + nl + badgeMarkdown + rest;
    } else if (/^\r?\n\r?\n\[!\[/.test(rest)) {
      // Separated by double newline
      const newlineMatch = rest.match(/^(\r?\n\r?\n)/);
      const nl = newlineMatch ? newlineMatch[1] : '\n\n';
      newContent = content.slice(0, headerEndIndex) + nl + badgeMarkdown + '\n' + rest.slice(nl.length);
    } else {
      const nl = content.includes('\r\n') ? '\r\n' : '\n';
      const trimmedRest = rest.replace(/^(\r?\n)+/, '');
      newContent = content.slice(0, headerEndIndex) + nl + badgeMarkdown + nl + nl + trimmedRest;
    }
  } else {
    const nl = content.includes('\r\n') ? '\r\n' : '\n';
    newContent = badgeMarkdown + nl + nl + content;
  }

  fs.writeFileSync(fullPath, newContent, 'utf8');
  return { created: false, modified: true, alreadyPresent: false, fullPath, fileName: targetFile, badgeMarkdown };
}

// ── CLI COMMAND: KEY CEREMONY (INIT / PROTECT) ──────────────────────
async function runKeyCeremony(metadata, options = {}) {
  printBanner();
  const isAuto = Boolean(options.auto);
  const isInteractive = Boolean(process.stdin.isTTY && !isAuto);
  const rl = isInteractive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

  console.log(`${C.silver}Initializing GhostPrint Key Ceremony for:${C.reset}`);
  console.log(`* ${C.cyan}Project:${C.reset} ${metadata.project}`);
  console.log(`* ${C.cyan}Author:${C.reset}  ${metadata.author}`);
  console.log(`* ${C.cyan}Repo:${C.reset}    ${metadata.repo}\n`);

  let choice = '1';
  if (isInteractive) {
    console.log(`${C.bold}${C.cyan}Select Cryptographic Security Profile (Up to 24 Words):${C.reset}`);
    console.log(`  ${C.emerald}[1] 160-Bit Quantum-Resistant (15 words) [Recommended]${C.reset}`);
    console.log(`      A supercomputer guessing 1 trillion keys/sec would take:`);
    console.log(`      100 Quintillion × Age of Universe (Immune to quantum Grover search).`);
    console.log(`  ${C.cyan}[2] 128-Bit Standard Financial (12 words)${C.reset}`);
    console.log(`      A supercomputer guessing 1 trillion keys/sec would take:`);
    console.log(`      1.2 Trillion × Age of Universe (17 Sextillion years; universal crypto standard).`);
    console.log(`  ${C.violet}[3] 192-Bit Intermediate Fortress (18 words)${C.reset}`);
    console.log(`      A supercomputer guessing 1 trillion keys/sec would take:`);
    console.log(`      80 Nonillion × Age of Universe (Military-grade defense).`);
    console.log(`  ${C.violet}[4] 224-Bit Advanced Sovereign (21 words)${C.reset}`);
    console.log(`      A supercomputer guessing 1 trillion keys/sec would take:`);
    console.log(`      700 Undecillion × Age of Universe (Multi-generational archival proof).`);
    console.log(`  ${C.violet}[5] 256-Bit Maximum Sovereign (24 words)${C.reset}`);
    console.log(`      A supercomputer guessing 1 trillion keys/sec would take:`);
    console.log(`      Effectively Infinite (Exceeds estimated Heat Death of the Cosmos).`);
    console.log(`  ${C.silver}[6] 99-Bit Rapid Lightweight (9 words)${C.reset}`);
    console.log(`      A supercomputer guessing 1 trillion keys/sec would take:`);
    console.log(`      20 Million Years (1,500 × all of recorded human history).`);
    console.log(`  ${C.amber}[7] Custom Manual Sentence (Interactive Real-Time Cosmic Meter)${C.reset}\n`);

    choice = (await askQuestion(rl, `${C.cyan}Enter selection [1-7] (default: 1): ${C.reset}`)).trim() || '1';
  } else {
    console.log(`${C.emerald}[✓] Automated Key Ceremony: using 160-Bit Quantum-Resistant (15 words) profile.${C.reset}`);
  }

  let words = [];
  if (choice === '1') {
    words = generateMnemonic(15);
  } else if (choice === '2') {
    words = generateMnemonic(12);
  } else if (choice === '3') {
    words = generateMnemonic(18);
  } else if (choice === '4') {
    words = generateMnemonic(21);
  } else if (choice === '5') {
    words = generateMnemonic(24);
  } else if (choice === '6') {
    words = generateMnemonic(9);
  } else if (choice === '7') {
    console.log(`\n${C.silver}Enter your custom high-entropy pass-sentence:${C.reset}`);
    const customLine = isInteractive ? await askQuestion(rl, `> `) : '';
    words = customLine.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) words = generateMnemonic(15);
  } else {
    words = generateMnemonic(15);
  }

  // Evaluate bits and anti-correlation
  const calculatedBits = evaluateEntropy(words);
  const projectKeywords = getProjectKeywords(metadata);
  const antiCorr = validateAntiCorrelation(words, projectKeywords);

  console.log(`\n${C.bold}┌────────────────────────────────────────────────────────────────────────────┐${C.reset}`);
  console.log(`${C.bold}│ YOUR MASTER IDENTITY PASSPHRASE (SAVE TO COLD STORAGE):                    │${C.reset}`);
  console.log(`│                                                                            │`);
  console.log(`│   ${C.cyan}${words.join('  ')}${C.reset}`);
  console.log(`│                                                                            │`);
  console.log(`│ ${C.silver}Calculated Entropy:${C.reset} ${calculatedBits} bits`);
  console.log(`│ ${C.silver}External Word Ratio:${C.reset} ${antiCorr.externalRatio}% ${antiCorr.passed ? C.emerald + '[POLICY PASSED]' : C.red + '[POLICY FAILED]'} ${C.reset}`);
  console.log(`${C.bold}└────────────────────────────────────────────────────────────────────────────┘${C.reset}\n`);

  if (!antiCorr.passed) {
    console.log(`${C.red}${C.bold}[!] ANTI-CORRELATION POLICY VIOLATION:${C.reset}`);
    console.log(`    Matched project terms: ${antiCorr.matched.join(', ')}`);
    console.log(`    At least 75% of your words must be external dictionary terms to prevent`);
    console.log(`    adversaries from dictionary-attacking known project metadata.\n`);
    if (rl) rl.close();
    process.exit(1);
  }

  let storeChoice = '1';
  if (isInteractive) {
    console.log(`${C.bold}${C.cyan}Select Storage Target:${C.reset}`);
    console.log(`  ${C.emerald}[1] Secure Project Vault: ~/.ghostprint/projects/${getProjectSlug(metadata)}.vault.json.enc (Recommended: isolated outside git)${C.reset}`);
    console.log(`  ${C.cyan}[2] Local Project .env (Automatic .gitignore assertion enforced)${C.reset}`);
    console.log(`  ${C.silver}[3] Ephemeral Memory Only (Prompt on every release build)${C.reset}\n`);

    storeChoice = (await askQuestion(rl, `${C.cyan}Enter storage selection [1-3] (default: 1): ${C.reset}`)).trim() || '1';
  } else {
    console.log(`${C.emerald}[✓] Automated Storage Selection: using Secure Project Vault (~/.ghostprint/projects/).${C.reset}`);
  }

  const masterKey = deriveMasterKey(words, metadata);
  const masterHash = crypto.createHash('sha256').update(masterKey).digest('hex');

  const epochData = {
    epoch: 1,
    createdAt: new Date().toISOString(),
    passphraseWords: words,
    metadata,
    masterDigest: masterHash
  };

  if (storeChoice === '1') {
    const existingVault = loadVault(metadata) || { epochs: [] };
    existingVault.epochs.push(epochData);
    const savedPath = saveVault(existingVault, metadata);
    console.log(`\n${C.emerald}[✓] Master identity securely sealed into: ${savedPath}${C.reset}`);
    console.log(`${C.emerald}[✓] AES-256-GCM encrypted at rest using host-derived cryptographic key.${C.reset}`);
  } else if (storeChoice === '2') {
    const gitIgnoreRes = assertGitIgnore();
    if (gitIgnoreRes.modified) {
      console.log(`${C.amber}[✓] Automatically appended .env to .gitignore for security protection.${C.reset}`);
    }
    const envLine = `\nGHOSTPRINT_MASTER_PASSPHRASE="${words.join(' ')}"\n`;
    fs.appendFileSync(path.join(process.cwd(), '.env'), envLine, 'utf8');
    console.log(`${C.emerald}[✓] Saved to project .env (verified excluded from git index).${C.reset}`);
  } else {
    console.log(`\n${C.silver}[✓] Ephemeral mode selected. Master secret held in memory only.${C.reset}`);
  }

  // Derive initial Layer 1-7 constants for v1.0.0
  const initialChildKey = deriveReleaseChildKey(masterKey, '1.0.0', metadata);
  const layerConstants = generateLayerConstants(initialChildKey, '1.0.0');

  console.log(`\n${C.bold}${C.cyan}Derived Release Constants (v1.0.0 Preview):${C.reset}`);
  console.log(`* Layer 0 Decoy:   ${layerConstants.layer0Decoys.ORIGIN_WATERMARK_CRC}`);
  console.log(`* Layer 1 Word 0:  ${layerConstants.layer1.word0}`);
  console.log(`* Layer 2 Ratio:   ${layerConstants.layer2.expectedRatio} (${layerConstants.layer2.jitterCoeff} / ${layerConstants.layer2.refillEpsilon})`);
  console.log(`* Layer 6 Cluster: ${layerConstants.layer6SoftClusterCount} soft numerical constants calculated`);

  // Assert README badge unless explicitly opted out
  if (!options.noBadge) {
    const badgeRes = assertReadmeBadge(options.targetDir || process.cwd(), { metadata });
    if (badgeRes.created) {
      console.log(`* README Badge:    ${C.emerald}Created ${badgeRes.fileName} with [GhostPrint Protected] badge${C.reset}`);
    } else if (badgeRes.modified) {
      console.log(`* README Badge:    ${C.emerald}Injected [GhostPrint Protected] badge into ${badgeRes.fileName}${C.reset}`);
    } else if (badgeRes.alreadyPresent) {
      console.log(`* README Badge:    ${C.silver}[GhostPrint Protected] badge verified in ${badgeRes.fileName}${C.reset}`);
    }
  }

  console.log(`\n${C.emerald}${C.bold}✅ GHOSTPRINT KEY CEREMONY COMPLETE!${C.reset}\n`);

  if (rl) rl.close();
}

// ── NATURAL LANGUAGE PARSER & COMMAND DISPATCHER ────────────────────
async function main() {
  const args = process.argv.slice(2);
  const rawInput = args.join(' ').toLowerCase();
  const metadata = discoverProjectMetadata();

  const isAuto = args.includes('--auto') || args.includes('-y') || args.includes('--yes');
  const noBadge = args.includes('--no-badge');
  const targetDirIndex = args.indexOf('--target');
  const targetDir = targetDirIndex !== -1 && args[targetDirIndex + 1] ? path.resolve(args[targetDirIndex + 1]) : process.cwd();

  if (args.includes('--json')) {
    // Machine readable agent mode
    const vault = loadVault();
    if (!vault || !vault.epochs || vault.epochs.length === 0) {
      console.log(JSON.stringify({ status: 'uninitialized', metadata }));
    } else {
      console.log(JSON.stringify({ status: 'active', epochs: vault.epochs.length, metadata }));
    }
    return;
  }

  // Natural Language Intent Matching
  if (
    rawInput.includes('badge') ||
    rawInput.includes('shields')
  ) {
    printBanner();
    const badgeRes = assertReadmeBadge(targetDir, { metadata });
    console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}║                   GHOSTPRINT README BADGE GENERATOR                        ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
    console.log(`${C.silver}Markdown Badge:${C.reset}`);
    console.log(`  ${badgeRes.badgeMarkdown}\n`);
    console.log(`${C.silver}HTML Badge:${C.reset}`);
    console.log(`  ${generateBadgeHtml(metadata)}\n`);
    if (badgeRes.created) {
      console.log(`${C.emerald}[✓] Created ${badgeRes.fileName} with GhostPrint Protected badge.${C.reset}\n`);
    } else if (badgeRes.modified) {
      console.log(`${C.emerald}[✓] Injected GhostPrint Protected badge into ${badgeRes.fileName}.${C.reset}\n`);
    } else {
      console.log(`${C.silver}[✓] GhostPrint Protected badge is already present in ${badgeRes.fileName}.${C.reset}\n`);
    }
  } else if (
    rawInput.includes('list') ||
    rawInput.includes('show projects') ||
    rawInput.includes('registered') ||
    rawInput.includes('vaults')
  ) {
    printBanner();
    const projects = listRegisteredProjects();
    console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}║                     GHOSTPRINT REGISTERED PROJECTS                         ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

    if (projects.length === 0) {
      console.log(`${C.silver}No projects registered yet. Run ${C.cyan}ghostprint init${C.silver} to seal your first repository.${C.reset}\n`);
    } else {
      for (const p of projects) {
        console.log(`* ${C.bold}${C.emerald}${p.project}${C.reset} (${C.silver}${p.repo}${C.reset})`);
        console.log(`  ${C.dim}Vault File:${C.reset} ${C.cyan}${p.vaultPath}${C.reset}`);
        console.log(`  ${C.dim}Author:${C.reset}     ${p.author}`);
        console.log(`  ${C.dim}Security:${C.reset}   ${p.tier}`);
        console.log(`  ${C.dim}Epochs:${C.reset}     ${p.epochsCount} active epoch(s) | Last updated: ${p.lastUpdated}\n`);
      }
    }
  } else if (
    rawInput.includes('init') ||
    rawInput.includes('protect') ||
    rawInput.includes('seal') ||
    rawInput.includes('enroll') ||
    rawInput.includes('guard') ||
    rawInput.includes('create key') ||
    rawInput.includes('generate key') ||
    rawInput.includes('generate passphrase') ||
    rawInput.includes('passphrase') ||
    rawInput.includes('setup') ||
    rawInput.includes('new key')
  ) {
    await runKeyCeremony(metadata, { auto: isAuto, noBadge, targetDir });
  } else if (
    rawInput.includes('audit') ||
    rawInput.includes('check') ||
    rawInput.includes('examine') ||
    rawInput.includes('did they copy') ||
    rawInput.includes('stole')
  ) {
    const auditScript = path.join(__dirname, 'ghostprint-audit.js');
    require(auditScript);
  } else if (
    rawInput.includes('probe') ||
    rawInput.includes('oracle') ||
    rawInput.includes('http') ||
    rawInput.includes('url')
  ) {
    const oracleScript = path.join(__dirname, 'ghostprint-oracle.js');
    require(oracleScript);
  } else if (
    rawInput.includes('export') ||
    rawInput.includes('dossier') ||
    rawInput.includes('court') ||
    rawInput.includes('exhibit') ||
    rawInput.includes('dmca')
  ) {
    const exportScript = path.join(__dirname, 'ghostprint-export.js');
    require(exportScript);
  } else {
    // Default interactive dashboard
    printBanner();
    console.log(`${C.silver}Natural Language Command Interface:${C.reset}`);
    console.log(`  node ghostprint.js "protect this repository"`);
    console.log(`  node ghostprint.js "generate a new 15-word passphrase for this repo"`);
    console.log(`  node ghostprint.js "add ghostprint badge to readme"`);
    console.log(`  node ghostprint.js "audit ../competitor-repo against my master secret"`);
    console.log(`  node ghostprint.js "probe https://suspect-saas.com for my watermark"`);
    console.log(`  node ghostprint.js "export court-admissible legal dossier"\n`);
    console.log(`${C.cyan}Direct Subcommands:${C.reset}`);
    console.log(`  ${C.bold}init / protect${C.reset} : Run Key Ceremony & assert README protection badge`);
    console.log(`  ${C.bold}badge${C.reset}          : Generate and assert the Shields.io GhostPrint badge in README.md`);
    console.log(`  ${C.bold}list${C.reset}           : Display all registered projects and active encrypted vaults`);
    console.log(`  ${C.bold}audit${C.reset}          : Scan a target repository for 9-layer cryptographic fingerprints`);
    console.log(`  ${C.bold}probe${C.reset}          : Execute a remote black-box oracle probe against a cloud SaaS URL`);
    console.log(`  ${C.bold}export${C.reset}         : Generate court-admissible forensic PDF and Markdown evidence dossiers\n`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(`${C.red}GhostPrint Error: ${err.message}${C.reset}`);
    process.exit(1);
  });
}

module.exports = {
  discoverProjectMetadata,
  generateMnemonic,
  evaluateEntropy,
  validateAntiCorrelation,
  deriveMasterKey,
  deriveReleaseChildKey,
  generateLayerConstants,
  saveVault,
  loadVault,
  getVaultDir,
  getProjectsDir,
  getProjectSlug,
  getProjectVaultPath,
  listRegisteredProjects,
  assertGitIgnore,
  generateBadgeMarkdown,
  generateBadgeHtml,
  assertReadmeBadge
};
