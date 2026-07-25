#!/usr/bin/env node
/**
 * domain-anchor-scanner.js — builds the domain anchor list for NL interview scenario population.
 *
 * Reads all active topology projects and extracts real project/category/seam/contract names
 * so interview scenarios reference concrete artifacts, not abstract placeholders.
 *
 * Usage:
 *   node domain-anchor-scanner.js [--project <slug>]
 *
 * Output: JSON object keyed by project slug, each with categories, seams, contracts,
 *         hitl_reasons, deferred_topics, and priority_context.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ACTIVE_DIR = path.resolve(__dirname, '..', '..', '..', '.docs', 'v2', 'projects', 'active');
const COMPASS_DIR = path.resolve(__dirname, '..', '..', '..', '.docs', 'v2', 'compass');

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch (e) { return null; }
}

function listDirs(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); }
  catch (e) { return []; }
}

function extractYamlFrontmatter(content) {
  if (!content || !content.startsWith('---')) return {};
  const end = content.indexOf('---', 3);
  if (end === -1) return {};
  return content.substring(3, end).trim();
}

// ─── Project scanning ───────────────────────────────────────────────────────

function scanProject(projectSlug) {
  const projectDir = path.join(ACTIVE_DIR, projectSlug);
  const topoClaude = readFileSync(path.join(projectDir, 'TOPOLOGY-CLAUDE.md'));
  if (!topoClaude) return null;

  const anchor = {
    project: projectSlug,
    categories: [],
    seams: [],
    contracts: [],
    hitl_reasons: [],
    deferred_topics: [],
    priority_context: '',
  };

  // Extract categories from TOPOLOGY-CLAUDE.md category table
  const catPattern = /\|\s*\d+\s*\|\s*(.+?)\s*\|/g;
  let match;
  while ((match = catPattern.exec(topoClaude)) !== null) {
    const name = match[1].trim();
    if (name && !name.includes('---') && !name.includes('Name')) {
      anchor.categories.push(name);
    }
  }

  // Read CONTRACT-SHEET.md for contract IDs
  const contractSheet = readFileSafe(path.join(projectDir, 'CONTRACT-SHEET.md'));
  if (contractSheet) {
    const contractPattern = /Contract\s+(\d+)\s*[—\-]\s*(.+)/gi;
    let cm;
    while ((cm = contractPattern.exec(contractSheet)) !== null) {
      anchor.contracts.push(`C${cm[1]} — ${cm[2].trim()}`);
    }
  }

  // Read SYSTEM-TOPOLOGY.md for seam IDs
  const systemTopo = readFileSafe(path.join(projectDir, 'SYSTEM-TOPOLOGY.md'));
  if (systemTopo) {
    const seamPattern = /Seam\s+(\d+)\s*[—\-]\s*(.+)/gi;
    let sm;
    while ((sm = seamPattern.exec(systemTopo)) !== null) {
      anchor.seams.push(`S${sm[1]} — ${sm[2].trim()}`);
    }
  }

  // Read CHECKPOINT.md for HITL reasons
  const checkpoint = readFileSafe(path.join(projectDir, 'CHECKPOINT.md'));
  if (checkpoint) {
    const frontmatter = extractYamlFrontmatter(checkpoint);
    const hitlMatch = frontmatter.match(/hitl_reason:\s*(.+)/);
    if (hitlMatch) anchor.hitl_reasons.push(hitlMatch[1].trim());

    // Also check sprint checkpoints
    const sprintsDir = path.join(projectDir, 'sprints');
    const sprintDirs = listDirs(sprintsDir);
    for (const sd of sprintDirs) {
      const spCheckpoint = readFileSafe(path.join(sprintsDir, sd, 'CHECKPOINT.md'));
      if (spCheckpoint) {
        const spFm = extractYamlFrontmatter(spCheckpoint);
        const spHitl = spFm.match(/hitl_reason:\s*(.+)/);
        if (spHitl) anchor.hitl_reasons.push(spHitl[1].trim());
      }
    }
  }

  // Read DECISION-LOG.md for deferred decisions
  const decisionLog = readFileSafe(path.join(projectDir, 'DECISION-LOG.md'));
  if (decisionLog) {
    const deferredPattern = /DL-\d+.*?Deferred/gi;
    let dm;
    while ((dm = deferredPattern.exec(decisionLog)) !== null) {
      anchor.deferred_topics.push(dm[0].trim());
    }
  }

  // Read PRIORITY-MAP for priority context
  const priorityMap = readFileSafe(path.join(COMPASS_DIR, 'PRIORITY-MAP.md'));
  if (priorityMap) {
    const contextPattern = new RegExp(`\\*\\*${escapeRegex(projectSlug.replace(/-/g, ' '))}\\*\\*|${escapeRegex(projectSlug)}`, 'gi');
    const ctxMatch = priorityMap.match(contextPattern);
    if (ctxMatch) {
      // Extract the surrounding context (the row description)
      const idx = priorityMap.indexOf(ctxMatch[0]);
      const lineStart = priorityMap.lastIndexOf('\n', idx);
      const lineEnd = priorityMap.indexOf('\n', idx);
      const contextLine = priorityMap.substring(lineStart, lineEnd).trim();
      anchor.priority_context = contextLine.substring(0, 200);
    }
  }

  return anchor;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readFileSync(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch (e) { return null; }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let targetProject = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      targetProject = args[i + 1];
      i++;
    }
  }

  const projectDirs = listDirs(ACTIVE_DIR);
  const anchors = {};

  for (const projectSlug of projectDirs) {
    if (targetProject && projectSlug !== targetProject) continue;

    const topoClaude = path.join(ACTIVE_DIR, projectSlug, 'TOPOLOGY-CLAUDE.md');
    if (!fs.existsSync(topoClaude)) continue;

    const anchor = scanProject(projectSlug);
    if (anchor) {
      anchors[projectSlug] = anchor;
    }
  }

  console.log(JSON.stringify(anchors, null, 2));
}

main();
