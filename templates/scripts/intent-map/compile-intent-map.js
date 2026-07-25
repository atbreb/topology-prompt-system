#!/usr/bin/env node
/**
 * compile-intent-map.js — transforms NL interview responses into intent-map.json.
 *
 * Consumes structured interview output (from nl-interview.js) and produces
 * a valid intent-map.json conforming to the canonical JSON Schema.
 *
 * Usage:
 *   node compile-intent-map.js --input <interview-output.json> [--output <path>]
 *
 * Output: intent-map.json at ~/.claude/topology/intent-map.<project-hash>.json
 *         + SHA-256 integrity hash at intent-map.<project-hash>.json.sha256
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUTPUT_DIR = path.join(os.homedir(), '.claude', 'topology');

// ─── Phrase extraction ──────────────────────────────────────────────────────

function extractPhrases(response) {
  const text = response.trim();
  if (!text) return [];

  // Split on sentence boundaries, question marks, or natural pauses
  const segments = text.split(/[.?!;]\s+/).filter(s => s.trim().length > 0);

  const phrases = [];
  for (const seg of segments) {
    const cleaned = seg.trim().toLowerCase();
    if (cleaned.length >= 3) {
      phrases.push(cleaned);
    }
  }

  // Also include the full response as a phrase if it's reasonably short
  if (text.length <= 120) {
    phrases.push(text.toLowerCase());
  }

  return [...new Set(phrases)]; // deduplicate
}

function extractKeywords(response) {
  const words = response.toLowerCase().split(/\s+/);
  // Extract significant words (3+ chars, not common stopwords)
  const stopwords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
    'our', 'you', 'your', 'he', 'she', 'they', 'them', 'and', 'but', 'or',
    'not', 'no', 'if', 'then', 'else', 'just', 'about', 'very', 'really',
  ]);

  return words
    .filter(w => w.length >= 3 && !stopwords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // deduplicate
}

// ─── Pattern extraction ─────────────────────────────────────────────────────

function extractPatterns(phrases) {
  const patterns = [];

  for (const phrase of phrases) {
    // Common query patterns
    if (/^(what|how|where|when|why|who|can|could|would|should|is|are|does|do|did)/i.test(phrase)) {
      patterns.push(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    // Specific entity references
    if (/\b(the|my|our|this)\s+\w+\s+\w+/i.test(phrase)) {
      patterns.push(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
  }

  return patterns;
}

// ─── Domain vocabulary extraction ───────────────────────────────────────────

function extractDomainVocab(responses, anchors) {
  const vocab = {};

  for (const response of responses) {
    if (!response.vocabularyProbe) continue;

    const probe = response.vocabularyProbe.trim();
    if (!probe) continue;

    // Parse probe: "I call it X" or "X = Y" or just a term
    const term = probe.split(/[=:,]/)[0].trim().toLowerCase();
    if (term.length < 2) continue;

    // Try to map to a project from the domain anchors
    let mappedProject = null;
    if (anchors) {
      for (const [slug, anchor] of Object.entries(anchors)) {
        if (probe.toLowerCase().includes(slug.toLowerCase()) ||
            probe.toLowerCase().includes(anchor.project.toLowerCase())) {
          mappedProject = slug;
          break;
        }
      }
    }

    vocab[term] = {
      project: mappedProject || 'unknown',
      source: response.scenarioId,
    };
  }

  return vocab;
}

// ─── Intent clustering ──────────────────────────────────────────────────────

function buildIntents(responses) {
  // Group responses by target command
  const byCommand = {};
  for (const r of responses) {
    if (!r.targetCommand) continue;
    if (!byCommand[r.targetCommand]) byCommand[r.targetCommand] = [];
    byCommand[r.targetCommand].push(r);
  }

  const intents = [];
  let idCounter = 1;

  for (const [command, cmds] of Object.entries(byCommand)) {
    const allPhrases = [];
    const allKeywords = [];
    const allPatterns = [];

    for (const r of cmds) {
      const phrases = extractPhrases(r.response);
      allPhrases.push(...phrases);
      allKeywords.push(...extractKeywords(r.response));
      allPatterns.push(...extractPatterns(phrases));
    }

    // Determine arg inference strategy
    let argInference = 'current-project';
    if (command === 'topology-gates' || command === 'topology-next') {
      argInference = 'current-project';
    } else if (command === 'topology-diagnose') {
      argInference = 'infer-from-domain';
    } else if (command === 'topology-e2e' || command === 'topology-promote') {
      argInference = 'explicit-only';
    }

    intents.push({
      id: `intent-${String(idCounter++).padStart(3, '0')}`,
      command,
      argInference,
      phrases: [...new Set(allPhrases)].slice(0, 15), // top 15 unique phrases
      keywords: [...new Set(allKeywords)].slice(0, 20),
      patterns: [...new Set(allPatterns)].slice(0, 10),
      register: ['calm'], // Populated by Phase 3 analysis
      modifiers: {},
      domainSignals: {},
      confidence: 0.7, // Default, refined by Phase 5 correction sweep
      flags: {},
      denylist: ['topology-promote', 'topology-e2e', 'topology-merge', 'topology-sprint', 'topology-autopilot'].includes(command),
    });
  }

  return intents;
}

// ─── Compilation ────────────────────────────────────────────────────────────

function compile(inputPath) {
  const interviewData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const responses = interviewData.responses || [];
  const anchors = interviewData.anchors || {};

  if (responses.length === 0) {
    console.error('No interview responses found in input file.');
    process.exit(1);
  }

  const intents = buildIntents(responses);
  const domainVocabulary = extractDomainVocab(responses, anchors);

  const intentMap = {
    version: '1.0.0',
    built_at: new Date().toISOString(),
    source: path.basename(inputPath, '.json'),
    intents,
    domainVocabulary,
    routingDenylist: [
      'topology-promote',
      'topology-e2e',
      'topology-merge',
      'topology-sprint',
      'topology-autopilot',
    ],
    feedbackLoop: {
      logPath: '/tmp/nl-router.log',
      maxLogEntries: 10000,
    },
  };

  return intentMap;
}

// ─── Storage ────────────────────────────────────────────────────────────────

function saveIntentMap(intentMap, outputPath) {
  const json = JSON.stringify(intentMap, null, 2);

  // Compute integrity hash
  const hash = crypto.createHash('sha256').update(json).digest('hex');

  // Write intent map
  fs.writeFileSync(outputPath, json);

  // Write hash file
  fs.writeFileSync(outputPath + '.sha256', hash);

  return { path: outputPath, hash };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) { inputPath = args[i + 1]; i++; }
    else if (args[i] === '--output' && args[i + 1]) { outputPath = args[i + 1]; i++; }
  }

  if (!inputPath) {
    console.error('Usage: node compile-intent-map.js --input <interview-output.json> [--output <path>]');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Compile
  const intentMap = compile(inputPath);

  // Determine output path
  if (!outputPath) {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    // Generate a project hash from the cwd (simple hash of the repo path)
    const repoHash = crypto.createHash('sha256').update(process.cwd()).digest('hex').substring(0, 12);
    outputPath = path.join(OUTPUT_DIR, `intent-map.${repoHash}.json`);
  }

  // Save
  const result = saveIntentMap(intentMap, outputPath);

  console.log(`Intent map compiled:`);
  console.log(`  Intents: ${intentMap.intents.length}`);
  console.log(`  Domain vocabulary entries: ${Object.keys(intentMap.domainVocabulary).length}`);
  console.log(`  Saved to: ${result.path}`);
  console.log(`  Integrity hash: ${result.hash.substring(0, 16)}...`);
}

main();
