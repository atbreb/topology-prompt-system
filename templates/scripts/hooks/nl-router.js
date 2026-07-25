#!/usr/bin/env node
/**
 * nl-router.js — NL routing hook for UserPromptSubmit.
 *
 * Classifies user prompts via regex + optional LLM fallback and injects
 * a systemMessage routing hint. Never blocks the user — all failures
 * degrade to pass-through.
 *
 * Activated by UserPromptSubmit hook in .claude/settings.local.json.
 * Inert until intent-map.json exists at ~/.claude/topology/.
 *
 * Contracts: C1 (collaborative routing), C2 (regex-first), C3 (feedback loop),
 *            C5 (routing denylist), C7 (error degradation), C8 (format constraint)
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────────────────

const INTENT_MAP_DIR = path.join(os.homedir(), '.claude', 'topology');
const CONFIDENCE_THRESHOLD = 0.50;
const LLM_FALLBACK_ENABLED = process.env.ENABLE_NL_LLM_FALLBACK === '1';
const VERBOSE = process.env.ENABLE_NL_VERBOSE === '1';
const HOOK_TIMEOUT_MS = 4500; // under the 5s harness limit

// ─── Logging ────────────────────────────────────────────────────────────────

const LOG_FILE = '/tmp/nl-router.log';

function log(level, msg) {
  if (!VERBOSE && level === 'debug') return;
  const ts = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${ts}] [${level}] ${msg}\n`);
}

// ─── Intent Map Loading ─────────────────────────────────────────────────────

function findIntentMap() {
  try {
    const files = fs.readdirSync(INTENT_MAP_DIR);
    const mapFile = files.find(f => f.startsWith('intent-map.') && f.endsWith('.json'));
    if (!mapFile) return null;
    return path.join(INTENT_MAP_DIR, mapFile);
  } catch (e) {
    return null; // directory doesn't exist
  }
}

function loadIntentMap(mapPath) {
  try {
    const data = fs.readFileSync(mapPath, 'utf8');
    const intentMap = JSON.parse(data);

    // Integrity check: verify hash if available
    const hashPath = mapPath + '.sha256';
    if (fs.existsSync(hashPath)) {
      const expectedHash = fs.readFileSync(hashPath, 'utf8').trim();
      const actualHash = crypto.createHash('sha256').update(data).digest('hex');
      if (expectedHash !== actualHash) {
        log('error', `Integrity check FAILED for ${mapPath}`);
        return null;
      }
    }

    return intentMap;
  } catch (e) {
    log('error', `Failed to load intent map: ${e.message}`);
    return null;
  }
}

// ─── Classification ─────────────────────────────────────────────────────────

function classify(prompt, intentMap) {
  if (!intentMap || !intentMap.intents) return null;

  const normalized = prompt.toLowerCase().trim();
  let bestMatch = null;
  let bestScore = 0;

  for (const intent of intentMap.intents) {
    if (intent.denylist) continue;
    let score = 0;

    // Phrase matching (highest weight)
    for (const phrase of (intent.phrases || [])) {
      if (normalized.includes(phrase.toLowerCase())) {
        score += 30;
      }
    }

    // Keyword matching
    for (const keyword of (intent.keywords || [])) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += 10;
      }
      const wordBoundary = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      if (wordBoundary.test(normalized)) {
        score += 5;
      }
    }

    // Pattern matching
    for (const pattern of (intent.patterns || [])) {
      try {
        if (new RegExp(pattern, 'i').test(normalized)) {
          score += 20;
        }
      } catch (e) {
        log('error', `Invalid regex pattern in intent ${intent.id}: ${pattern}`);
      }
    }

    // Direct command name match
    if (normalized.includes(intent.command)) {
      score += 40;
    }

    // Domain signal boost
    if (intent.domainSignals) {
      for (const [domain, signals] of Object.entries(intent.domainSignals)) {
        for (const signal of signals) {
          if (normalized.includes(signal.toLowerCase())) {
            score += 15;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = intent;
    }
  }

  if (!bestMatch) return null;

  const confidence = Math.min(bestScore / 80, 1.0);
  return {
    command: bestMatch.command,
    confidence: Math.round(confidence * 100) / 100,
    intentId: bestMatch.id,
    score: bestScore,
  };
}

// ─── LLM Fallback ───────────────────────────────────────────────────────────

async function llmFallback(prompt, intentMap) {
  if (!LLM_FALLBACK_ENABLED) return null;

  // Stub: LLM fallback implementation deferred to dedicated phase.
  // When enabled, sends prompt text only (no file contents, no session context)
  // to a Haiku-tier model for classification. Returns {command, confidence} or null.
  log('debug', 'LLM fallback invoked but not yet implemented');
  return null;
}

// ─── Denylist Check ─────────────────────────────────────────────────────────

function isDenylisted(command, intentMap) {
  if (!intentMap || !intentMap.routingDenylist) return false;
  return intentMap.routingDenylist.includes(command);
}

// ─── Feedback Loop Detection ────────────────────────────────────────────────

function isOwnOutput(prompt) {
  // Prompt IS the hook's own systemMessage
  if (/^\[NL-ROUTER\]/.test(prompt.trim())) {
    return true;
  }
  // Model echoing hook output
  if (/UserPromptSubmit says:.*\[NL-ROUTER\]/i.test(prompt)) {
    return true;
  }
  // [NL-ROUTER] inside a code block (user sharing hook output)
  if (/```[^`]*\[NL-ROUTER\][^`]*```/s.test(prompt)) {
    return true;
  }
  return false;
}

const recentFingerprints = new Map();

function isEcho(prompt) {
  const fp = prompt.toLowerCase().replace(/\s+/g, ' ').trim();
  const now = Date.now();
  const lastSeen = recentFingerprints.get(fp);

  recentFingerprints.set(fp, now);

  // Prune old entries (>30s)
  for (const [key, ts] of recentFingerprints) {
    if (now - ts > 30000) recentFingerprints.delete(key);
  }

  return lastSeen && (now - lastSeen) < 2000;
}

// ─── Composition: Compound Prompt Detection ──────────────────────────────────

const COMPOUND_SPLITTERS = [
  /\s+and\s+then\s+/i,
  /\s+then\s+/i,
  /\s+and\s+also\s+/i,
  /\s+after\s+that\s+/i,
  /\s+and\s+/i,        // last — most aggressive, catches simple "X and Y"
];

/**
 * Detect if the prompt contains compound requests.
 * Returns an array of sub-prompts, or null if no compound detected.
 */
function detectCompound(prompt) {
  for (const splitter of COMPOUND_SPLITTERS) {
    const parts = prompt.split(splitter);
    if (parts.length >= 2) {
      const cleaned = parts.map(p => p.trim()).filter(p => p.length >= 3);
      if (cleaned.length >= 2) {
        log('debug', `Compound detected: ${cleaned.length} parts via ${splitter}`);
        return cleaned;
      }
    }
  }
  return null;
}

/**
 * Determine the context label for the current working directory.
 * Used to select the right chain in chainByContext lookups.
 *
 * Heuristics (checked in order):
 *   "topology-project" — cwd is under {PROJECTS_ACTIVE_DIR} or {PROJECTS_E2E_DIR}
 *   "harness"          — cwd is under .claude/commands/ or .claude/scripts/
 *   "code-project"     — default fallback (any other directory)
 */
function inferContext() {
  const cwd = process.cwd();
  // Match either the directory itself or a subdirectory within it
  if (/\.docs\/v2\/projects\/(active|e2e)(\/|$)/.test(cwd)) {
    return 'topology-project';
  }
  if (/\.claude\/(commands|scripts|hooks)(\/|$)/.test(cwd)) {
    return 'harness';
  }
  return 'code-project';
}

/**
 * Check if an intent has a composition chain defined.
 * Chains are pre-defined sequences in the intent map (e.g., "audit everything" → [check-drift, check-cells, check-seams]).
 *
 * Resolution order:
 *   1. chainByContext[inferContext()].chain — context-scoped chain (if context matches)
 *   2. intent.chain — default chain (fallback when no context entry matches)
 *   3. null — no chain defined
 */
function resolveChain(intent) {
  // Check context-scoped chains first
  if (intent.chainByContext && typeof intent.chainByContext === 'object') {
    const ctx = inferContext();
    const entry = intent.chainByContext[ctx];
    if (entry && entry.chain && Array.isArray(entry.chain) && entry.chain.length > 0) {
      log('debug', `Chain resolved via chainByContext[${ctx}]: ${entry.chain.join(' → ')}`);
      return entry.chain;
    }
  }

  // Fall back to default chain
  if (intent.chain && Array.isArray(intent.chain) && intent.chain.length > 0) {
    log('debug', `Chain resolved via default chain: ${intent.chain.join(' → ')}`);
    return intent.chain;
  }

  return null;
}

// ─── Routing Hint Generation ────────────────────────────────────────────────

function generateHint(classification) {
  // Enforce Contract 8: canonical format only
  return `[NL-ROUTER] → /${classification.command} · confidence: ${classification.confidence}`;
}

function generateMultiHint(classifications) {
  // Multi-step routing: [NL-ROUTER] → /cmd1 → /cmd2 → /cmd3 · confidence: N
  const steps = classifications.map(c => `/${c.command}`).join(' → ');
  const avgConfidence = classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length;
  return `[NL-ROUTER] → ${steps} · confidence: ${Math.round(avgConfidence * 100) / 100}`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Read stdin with timeout
  let inputData;
  try {
    const raw = fs.readFileSync(0, 'utf8');
    inputData = JSON.parse(raw);
  } catch (e) {
    log('error', `stdin read/parse failed: ${e.message}`);
    process.exit(0); // pass through
  }

  const prompt = (inputData.prompt || '').trim();

  // Guard 1: Empty prompt → pass through
  if (!prompt) {
    process.exit(0);
  }

  // Guard 2: Feedback loop detection
  if (isOwnOutput(prompt)) {
    log('debug', 'Feedback loop prevented: own output detected');
    process.exit(0);
  }

  if (isEcho(prompt)) {
    log('debug', 'Feedback loop prevented: echo detected');
    process.exit(0);
  }

  // Guard 3: Load intent map
  const mapPath = findIntentMap();
  if (!mapPath) {
    log('debug', 'No intent map found — pass through');
    process.exit(0);
  }

  const intentMap = loadIntentMap(mapPath);
  if (!intentMap) {
    log('debug', 'Intent map failed to load or integrity check — pass through');
    process.exit(0);
  }

  // Phase 1: Regex classification
  let regexResult = classify(prompt, intentMap);

  // Phase 1a: Composition — check for chains or compound prompts
  let classifications = [];

  if (regexResult && regexResult.confidence >= CONFIDENCE_THRESHOLD) {
    // Check if this intent has a pre-defined chain
    const chain = resolveChain(intentMap.intents.find(i => i.id === regexResult.intentId));
    if (chain) {
      log('debug', `Chain resolved: ${chain.join(' → ')}`);
      classifications = chain.map(cmd => ({ command: cmd, confidence: regexResult.confidence }));
    } else {
      classifications = [regexResult];
    }
  }

  // If no single-intent match, try compound detection
  if (classifications.length === 0) {
    const compoundParts = detectCompound(prompt);
    if (compoundParts) {
      for (const part of compoundParts) {
        const partResult = classify(part, intentMap);
        if (partResult && partResult.confidence >= CONFIDENCE_THRESHOLD) {
          classifications.push(partResult);
        }
      }
      if (classifications.length > 0) {
        log('debug', `Compound: ${classifications.length} intents from ${compoundParts.length} parts`);
      }
    }
  }

  // Fall back to single classification if no compound results
  if (classifications.length === 0 && regexResult) {
    log('debug', `Regex low confidence (${regexResult.confidence} < ${CONFIDENCE_THRESHOLD}) — trying LLM fallback`);
    const llmResult = await llmFallback(prompt, intentMap);
    if (llmResult) classifications = [llmResult];
  }

  // Guard 4: No classification → pass through
  if (classifications.length === 0) {
    log('debug', 'No classification — pass through');
    process.exit(0);
  }

  // Guard 5: Denylist check — filter out denylisted commands
  classifications = classifications.filter(c => !isDenylisted(c.command, intentMap));
  if (classifications.length === 0) {
    log('debug', 'All matched commands denylisted — pass through');
    process.exit(0);
  }

  // Generate and output routing hint (single or multi-step)
  const hint = classifications.length === 1
    ? generateHint(classifications[0])
    : generateMultiHint(classifications);

  log('info', `Routing: "${prompt.substring(0, 80)}" → ${hint}`);

  const output = { systemMessage: hint };
  console.log(JSON.stringify(output));
  process.exit(0);
}

// Run with timeout guard
const timeout = setTimeout(() => {
  log('error', 'Hook timeout — pass through');
  process.exit(0);
}, HOOK_TIMEOUT_MS);

main().then(() => {
  clearTimeout(timeout);
}).catch((e) => {
  clearTimeout(timeout);
  log('error', `Hook crashed: ${e.message}`);
  process.exit(0);
});
