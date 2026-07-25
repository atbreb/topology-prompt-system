#!/usr/bin/env node
/**
 * topology-role-infer.js — deterministic path→role inference for topology commands.
 *
 * Usage:
 *   node topology-role-infer.js <path> [--project <name>]
 *
 * Exit codes: 0 = role inferred, 1 = invalid path, 2 = unknown project
 *
 * Output: JSON { role: "backend-coder"|"frontend-coder"|"systems-engineer"|
 *                "ui-designer"|"security-auditor"|"general-purpose",
 *                confidence: 0-1, matchedPattern: string }
 *
 * Canonical source: topology-PRINCIPLES.md § Subagent model & type discipline
 * (the "Canonical path → role inference table"). This script IS that table
 * in executable form. If the PRINCIPLES table changes, update this script.
 */

'use strict';

// Canonical path→role inference table (DL-FH-003)
// Ordered by specificity — first match wins.
const ROLE_TABLE = [
  // Auth, secrets, billing, SQL injection–adjacent paths
  { pattern: /(?:auth|secrets|billing|sql).*\.(?:go|ts|tsx|sql)$/i, role: 'security-auditor', isReviewer: true },
  { pattern: /apps\/api\/db\/migrations\//, role: 'backend-coder' },
  { pattern: /apps\/api\//, role: 'backend-coder' },
  { pattern: /apps\/notification-service\//, role: 'backend-coder' },
  { pattern: /proto\//, role: 'backend-coder' },
  { pattern: /apps\/web\//, role: 'frontend-coder' },
  { pattern: /apps\/calibra-(?:sync|iq|learn|nexus)\//, role: 'frontend-coder' },
  { pattern: /apps\/craneguard\//, role: 'frontend-coder' },
  { pattern: /packages\/calibra-ui\//, role: 'frontend-coder' },
  { pattern: /packages\/ui\//, role: 'frontend-coder' },
  { pattern: /apps\/ai-service\//, role: 'general-purpose' },
  { pattern: /apps\/kong\//, role: 'systems-engineer' },
  { pattern: /apps\/ai-gateway\//, role: 'systems-engineer' },
  { pattern: /apps\/nats\//, role: 'systems-engineer' },
  { pattern: /Dockerfile/, role: 'systems-engineer' },
  { pattern: /\.github\/workflows\//, role: 'systems-engineer' },
  { pattern: /railway\.(?:toml|json)/, role: 'systems-engineer' },
  { pattern: /\.claude\//, role: 'general-purpose' },
  { pattern: /\.docs\//, role: 'general-purpose' },
  { pattern: /packages\//, role: 'general-purpose' },
  { pattern: /scripts\//, role: 'general-purpose' },
  { pattern: /services\//, role: 'general-purpose' },
];

function inferRole(filePath) {
  for (const entry of ROLE_TABLE) {
    if (entry.pattern.test(filePath)) {
      return {
        role: entry.role,
        confidence: 0.85,
        matchedPattern: entry.pattern.toString(),
        isReviewer: entry.isReviewer || false,
      };
    }
  }
  return { role: 'general-purpose', confidence: 0.5, matchedPattern: 'fallback' };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node topology-role-infer.js <path> [--project <name>]');
    process.exit(1);
  }

  const filePath = args[0];
  const result = inferRole(filePath);

  console.log(JSON.stringify(result));
  process.exit(0);
}

main();
