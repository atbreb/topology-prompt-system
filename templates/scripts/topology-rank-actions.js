#!/usr/bin/env node
/**
 * topology-rank-actions.js — deterministic action ranking for topology commands.
 *
 * Usage:
 *   node topology-rank-actions.js --mode <next|diagnose|gates> --items <json>
 *
 * Items JSON format: [{id, label, priority, compassWeight, severity, blockingCount, ...}]
 *
 * Modes:
 *   next      — Compass-weighted ranking (topology-next): +6 Compass weight,
 *               then unblocking count, then priority
 *   diagnose  — Severity-based ranking (topology-diagnose): critical first,
 *               then high, then medium, then low
 *   gates     — Unblocking-impact ranking (topology-gates): gates that block
 *               downstream categories ranked first
 *
 * Exit: 0 on success, 1 on parse error
 * Output: JSON array of ranked items with rationale
 */

'use strict';

const COMPASS_WEIGHT = 6; // DL-defined: Compass priority adds +6 to ranking weight

function rankNext(items) {
  return [...items]
    .map(item => {
      const compassScore = item.compassWeight || 0;
      const unblockingScore = item.blockingCount || 0;
      const priorityScore = item.priority || 0;
      return {
        ...item,
        _score: compassScore + unblockingScore + priorityScore,
        _rationale: [
          compassScore > 0 ? `Compass weight: +${compassScore}` : null,
          unblockingScore > 0 ? `Unblocks ${unblockingScore} downstream` : null,
          priorityScore > 0 ? `Priority: ${priorityScore}` : null,
        ].filter(Boolean).join('; ') || 'No strong signal',
      };
    })
    .sort((a, b) => b._score - a._score);
}

function rankDiagnose(items) {
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...items]
    .map(item => ({
      ...item,
      _score: severityOrder[item.severity] || 0,
      _rationale: `Severity: ${item.severity} (weight: ${severityOrder[item.severity] || 0})`,
    }))
    .sort((a, b) => b._score - a._score);
}

function rankGates(items) {
  return [...items]
    .map(item => {
      const downstreamBlocked = item.downstreamBlocked || 0;
      const categoryCount = item.categoryCount || 1;
      return {
        ...item,
        _score: downstreamBlocked * 2 + categoryCount,
        _rationale: downstreamBlocked > 0
          ? `Blocks ${downstreamBlocked} downstream categories across ${categoryCount} projects`
          : `${categoryCount} categories affected, no downstream blocks`,
      };
    })
    .sort((a, b) => b._score - a._score);
}

function main() {
  const args = process.argv.slice(2);
  let mode = 'next';
  let itemsJson = '[]';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1];
      i++;
    } else if (args[i] === '--items' && args[i + 1]) {
      itemsJson = args[i + 1];
      i++;
    }
  }

  let items;
  try {
    items = JSON.parse(itemsJson);
  } catch (e) {
    console.error(`Invalid JSON for --items: ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(items)) {
    console.error('--items must be a JSON array');
    process.exit(1);
  }

  let ranked;
  switch (mode) {
    case 'next':
      ranked = rankNext(items);
      break;
    case 'diagnose':
      ranked = rankDiagnose(items);
      break;
    case 'gates':
      ranked = rankGates(items);
      break;
    default:
      console.error(`Unknown mode: ${mode}. Valid modes: next, diagnose, gates`);
      process.exit(1);
  }

  console.log(JSON.stringify(ranked, null, 2));
  process.exit(0);
}

main();
