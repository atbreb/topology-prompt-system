#!/usr/bin/env node
/**
 * nl-interview.js — 5-phase NL interview engine.
 *
 * Presents scenarios from the scenario bank, populates them with real project
 * names from the domain anchor scanner, captures responses verbatim, and
 * outputs structured interview data consumable by the intent map compiler.
 *
 * Usage:
 *   node nl-interview.js --phase <1-5> [--output <path>] [--resume <session-id>]
 *
 * Phases:
 *   1 — Domain Scan (automated, ~3 min)
 *   2 — Command Coverage (~28 scenarios, ~30-35 min)
 *   3 — Frustration Ladder (~10 scenarios, ~10 min)
 *   4 — Edge Cases (~5 scenarios, ~5 min)
 *   5 — Correction Sweep (~5-10 min)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── Configuration ──────────────────────────────────────────────────────────

const SCENARIO_BANK_PATH = path.join(__dirname, 'scenario-bank.json');
const OUTPUT_DIR = path.join(require('os').homedir(), '.claude', 'topology', 'interviews');

// ─── Scenario Bank ──────────────────────────────────────────────────────────

const SCENARIO_BANK = {
  phase2: [
    // A. Orientation
    {
      id: 'A1', group: 'orientation', command: 'topology-status',
      template: 'You just came back from lunch. You were working on `[CURRENT-PROJECT]` earlier today — specifically the `[CURRENT-CATEGORY]` category. But you can\'t remember exactly where you left off, what phase you were in, or whether anything was blocked.',
      domainFields: ['CURRENT-PROJECT', 'CURRENT-CATEGORY'],
    },
    {
      id: 'A2', group: 'orientation', command: 'topology-next',
      template: 'You just opened your laptop for the day. Yesterday you were deep in the `[CURRENT-PROJECT]` project, but you also have `[OTHER-PROJECT]` running. You need a quick orienting picture — is anything on fire, what\'s active, where should you focus?',
      domainFields: ['CURRENT-PROJECT', 'OTHER-PROJECT'],
    },
    {
      id: 'A3', group: 'orientation', command: 'topology-status',
      template: 'Your boss / teammate / stakeholder asks: "Hey, what\'s the status of `[PROJECT]`? Is it almost done?" You realize you\'re not 100% sure where things stand — you know you\'ve been working on it but you want to confirm before answering.',
      domainFields: ['PROJECT'],
    },
    {
      id: 'A4', group: 'orientation', command: 'topology-status',
      template: 'You were working on `[CURRENT-PROJECT]` on your other machine. Now you\'re on this one. You ran `/handoff` before switching, but you want to make sure you pick up exactly where you left off — same category, same phase, nothing lost.',
      domainFields: ['CURRENT-PROJECT'],
    },

    // B. Continuation
    {
      id: 'B1', group: 'continuation', command: 'topology-resume',
      template: 'You had a decision gate blocking the `[CATEGORY]` category in `[PROJECT]`. Specifically, `[DL-ENTRY]` needed approval. You just approved it in DECISION-LOG.md. The blocker is gone. You want to continue from exactly where you were — not redo anything.',
      domainFields: ['CATEGORY', 'PROJECT', 'DL-ENTRY'],
    },
    {
      id: 'B2', group: 'continuation', command: 'topology-next',
      template: 'You just completed the `[CATEGORY]` category — all phases verified, VERIFICATION-REPORT.md written. You feel good about it. Now you need to know: what\'s the next category in the execution order for `[PROJECT]`, and is it ready to start?',
      domainFields: ['CATEGORY', 'PROJECT'],
    },
    {
      id: 'B3', group: 'continuation', command: 'topology-resume',
      template: 'You were in the middle of implementing Phase 2 of `[CATEGORY]` when you got pulled into a meeting. That was 3 hours ago. Now you\'re back. You want to pick up the implementation where you left off — same phase, same task, no re-planning.',
      domainFields: ['CATEGORY'],
    },
    {
      id: 'B4', group: 'continuation', command: 'topology-resume',
      template: 'The `[BLOCKING-CATEGORY]` category in `[PROJECT]` just merged. Your `[YOUR-CATEGORY]` category was waiting on it — it\'s a consumer of Seam `[SEAM-ID]`. The dependency is satisfied. You want to start building.',
      domainFields: ['BLOCKING-CATEGORY', 'PROJECT', 'YOUR-CATEGORY', 'SEAM-ID'],
    },
    {
      id: 'B5', group: 'continuation', command: 'topology-sprint',
      template: 'You just finished Group 2 of `[PROJECT]` — all categories verified, integration checkpoint clean, adversarial pass passed. You\'re on a roll. What\'s Group 3, and is it ready to sprint?',
      domainFields: ['PROJECT'],
    },

    // C. Diagnosis
    {
      id: 'C1', group: 'diagnosis', command: 'topology-diagnose',
      template: 'You\'re working on `[PROJECT]` and something feels off. You can\'t pinpoint it — maybe a test you didn\'t expect to fail, maybe something in the verification table looks stale, maybe the docs don\'t match the code. You want a broad health check to surface whatever\'s wrong, across the whole project.',
      domainFields: ['PROJECT'],
    },
    {
      id: 'C2', group: 'diagnosis', command: 'topology-diagnose',
      template: 'Someone reported that billing events aren\'t showing up. Specifically, the `[SEAM-ID]` seam in `[PROJECT]` — the producer side seems to emit events but the consumer never receives them. You need to trace that exact data flow end-to-end and find where it breaks.',
      domainFields: ['SEAM-ID', 'PROJECT'],
    },
    {
      id: 'C3', group: 'diagnosis', command: 'topology-diagnose',
      template: 'A test in the `[CATEGORY]` category was green yesterday. Today it\'s red. You haven\'t changed anything in this category, but you did merge a PR in `[OTHER-CATEGORY]` which shares Seam `[SEAM-ID]`. You want to find out if the merge broke the seam.',
      domainFields: ['CATEGORY', 'OTHER-CATEGORY', 'SEAM-ID'],
    },

    // D. Decision
    {
      id: 'D1', group: 'decision', command: 'topology-decide',
      template: 'You\'re about to choose between two approaches for implementing contract `[CONTRACT-ID]` in `[CATEGORY]`. Before you decide, you want to know: has this already been decided? Is there a DECISION-LOG entry that locks you into one path? What was the rationale?',
      domainFields: ['CONTRACT-ID', 'CATEGORY'],
    },
    {
      id: 'D2', group: 'decision', command: 'topology-gates',
      template: 'An agent hit a HITL gate in `[PROJECT]` — specifically, a `[HITL-REASON]` on the `[CATEGORY]` category. It proposed a DL entry. You need to approve, reject, or defer this decision. You want to see the full proposal and its downstream impact before ruling.',
      domainFields: ['PROJECT', 'HITL-REASON', 'CATEGORY'],
    },
    {
      id: 'D3', group: 'decision', command: 'topology-gates',
      template: 'You know there are probably some open HITL gates across your projects, but you\'re not sure exactly what or where. You want a single view of every decision that needs your attention — across all active projects — ranked by what unblocks the most work.',
      domainFields: [],
    },

    // E. Progress & Completion
    {
      id: 'E1', group: 'progress', command: 'topology-verify',
      template: 'You just finished implementing all phases of `[CATEGORY]` in `[PROJECT]`. All the code is committed. You think it honors its contracts and seams, but you want to verify it properly — not just check that tests pass, but run the full adversarial verification against the FUTURE-STATE assertions.',
      domainFields: ['CATEGORY', 'PROJECT'],
    },
    {
      id: 'E2', group: 'progress', command: 'topology-promote',
      template: 'All categories in `[PROJECT]` are verified. The integration checkpoint is clean. You think the project is done. You want to promote it — move it to the archive, update the tier docs, close the compass row, the whole thing. But you know there are human gates and you want to see what\'s required before the final step.',
      domainFields: ['PROJECT'],
    },
    {
      id: 'E3', group: 'progress', command: 'topology-e2e',
      template: '`[PROJECT]` is verified. You\'re about to promote it, but you remember there\'s an optional E2E testing stage. You\'re not sure if there are manual-verification items that need runtime testing before promotion. You want to know whether you should run E2E or skip straight to promote.',
      domainFields: ['PROJECT'],
    },
  ],

  phase3: [
    {
      id: 'F1', group: 'frustration', command: 'topology-diagnose',
      template: 'You\'ve been debugging this `[SEAM-ID]` issue for TWO HOURS. Every time you think you\'ve found the problem, it turns out to be something else. You\'re frustrated. You just want to know what\'s actually broken without having to trace through every file yourself.',
      domainFields: ['SEAM-ID'],
    },
    {
      id: 'F2', group: 'frustration', command: 'topology-gates',
      template: 'You\'re blocked on THREE different HITL gates across two projects. Every one of them is "waiting for operator decision." You know you\'re the operator. You just want to see everything that\'s waiting on you in one place so you can batch-approve and move on.',
      domainFields: [],
    },
    {
      id: 'F3', group: 'frustration', command: 'topology-next',
      template: 'You just spent 45 minutes context-switching between four different projects. You\'ve lost track of what\'s actually highest priority. You don\'t want to re-read the PRIORITY-MAP — you just want the system to tell you what to do next.',
      domainFields: [],
    },
    {
      id: 'F4', group: 'frustration', command: 'topology-status',
      template: 'Someone just walked up to your desk and asked "what\'s the status of the `[PROJECT]` project?" You need to answer RIGHT NOW and you haven\'t looked at it since yesterday. You don\'t want to open five different files.',
      domainFields: ['PROJECT'],
    },
  ],

  phase4: [
    {
      id: 'E1', group: 'edge-case', command: null,
      template: 'You type a single word. Just "status." No project, no category, no context.',
      expectedBehavior: 'The router should infer the current project from session state and route to topology-status.',
    },
    {
      id: 'E2', group: 'edge-case', command: null,
      template: 'You type something ambiguous: "check it." No clear intent signal. Could mean verify, could mean diagnose, could mean check a specific seam.',
      expectedBehavior: 'The router should fall back to LLM classification or pass through.',
    },
    {
      id: 'E3', group: 'edge-case', command: null,
      template: 'You type: "the billing thing is broken again — same thing as last time, the events aren\'t firing and I\'m getting paged."',
      expectedBehavior: 'Domain vocabulary ("billing thing" → bifrost-billing) should route to topology-diagnose with the billing project.',
    },
  ],
};

// ─── Domain anchor population ───────────────────────────────────────────────

function populateScenario(scenario, anchors) {
  if (!anchors || Object.keys(anchors).length === 0) {
    return scenario.template; // no anchors available, return raw template
  }

  const projectSlugs = Object.keys(anchors);
  const randomProject = () => projectSlugs[Math.floor(Math.random() * projectSlugs.length)];
  const randomAnchor = () => anchors[randomProject()] || null;

  let text = scenario.template;

  for (const field of (scenario.domainFields || [])) {
    const anchor = randomAnchor();
    if (!anchor) continue;

    let replacement = `[${field}]`;
    switch (field) {
      case 'CURRENT-PROJECT':
      case 'PROJECT':
      case 'OTHER-PROJECT':
      case 'BLOCKING-PROJECT':
        replacement = anchor.project || `[${field}]`;
        break;
      case 'CURRENT-CATEGORY':
      case 'CATEGORY':
      case 'YOUR-CATEGORY':
      case 'BLOCKING-CATEGORY':
      case 'OTHER-CATEGORY':
        replacement = (anchor.categories && anchor.categories[0]) || `[${field}]`;
        break;
      case 'SEAM-ID':
      case 'SEAM':
        replacement = (anchor.seams && anchor.seams[0]) || `[${field}]`;
        break;
      case 'CONTRACT-ID':
        replacement = (anchor.contracts && anchor.contracts[0]) || `[${field}]`;
        break;
      case 'DL-ENTRY':
        replacement = (anchor.deferred_topics && anchor.deferred_topics[0]) || `[${field}]`;
        break;
      case 'HITL-REASON':
        replacement = (anchor.hitl_reasons && anchor.hitl_reasons[0]) || `[${field}]`;
        break;
    }
    text = text.replace(`[${field}]`, replacement);
  }

  return text;
}

// ─── Interview engine ───────────────────────────────────────────────────────

async function runPhase(phaseNum, scenarios, anchors, output) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log(`\n=== Phase ${phaseNum} ===\n`);

  const responses = [];
  const startTime = Date.now();

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const populatedText = populateScenario(scenario, anchors);

    console.log(`\n─── Scenario ${i + 1}/${scenarios.length} (${scenario.id}) ───`);
    console.log(`\n${populatedText}\n`);

    if (scenario.expectedBehavior) {
      console.log(`(Expected behavior: ${scenario.expectedBehavior})\n`);
    }

    console.log('What do you type? Type exactly what you\'d actually type — as casually as you would.\n');
    const response = await question('> ');

    const t0 = Date.now();

    // Vocabulary probe
    console.log('\nQuick vocabulary check:');
    const vocabResponse = await question('Any shorthand or nicknames you use for this? (press Enter to skip) > ');

    responses.push({
      scenarioId: scenario.id,
      scenarioGroup: scenario.group,
      targetCommand: scenario.command,
      populatedTemplate: populatedText,
      response: response.trim(),
      responseTimeMs: Date.now() - t0,
      vocabularyProbe: vocabResponse.trim() || null,
      timestamp: new Date().toISOString(),
    });

    if (output) {
      fs.writeFileSync(output, JSON.stringify({ phase: phaseNum, responses, anchors }, null, 2));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
  console.log(`\nPhase ${phaseNum} complete. ${responses.length} responses in ~${elapsed} min.\n`);

  rl.close();
  return responses;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let phase = null;
  let outputPath = null;
  let resumeSession = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) { phase = parseInt(args[i + 1]); i++; }
    else if (args[i] === '--output' && args[i + 1]) { outputPath = args[i + 1]; i++; }
    else if (args[i] === '--resume' && args[i + 1]) { resumeSession = args[i + 1]; i++; }
  }

  if (!phase || phase < 1 || phase > 5) {
    console.error('Usage: node nl-interview.js --phase <1-5> [--output <path>]');
    console.error('  1 — Domain Scan (automated)');
    console.error('  2 — Command Coverage (~18 scenarios)');
    console.error('  3 — Frustration Ladder (~4 scenarios)');
    console.error('  4 — Edge Cases (~3 scenarios)');
    console.error('  5 — Correction Sweep');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!outputPath) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    outputPath = path.join(OUTPUT_DIR, `interview-${ts}.json`);
  }

  // Phase 1: Domain Scan (automated)
  if (phase === 1) {
    console.log('Running automated domain scan...');
    const { execSync } = require('child_process');
    try {
      const scannerPath = path.join(__dirname, 'domain-anchor-scanner.js');
      const result = execSync(`node "${scannerPath}"`, { encoding: 'utf8' });
      const anchors = JSON.parse(result);

      fs.writeFileSync(outputPath, JSON.stringify({ phase: 1, anchors, timestamp: new Date().toISOString() }, null, 2));
      console.log(`Domain scan complete. ${Object.keys(anchors).length} projects scanned.`);
      console.log(`Output: ${outputPath}`);
      process.exit(0);
    } catch (e) {
      console.error(`Domain scan failed: ${e.message}`);
      process.exit(1);
    }
  }

  // Load anchors from prior phases
  let anchors = {};
  if (resumeSession && fs.existsSync(resumeSession)) {
    const sessionData = JSON.parse(fs.readFileSync(resumeSession, 'utf8'));
    anchors = sessionData.anchors || {};
    console.log(`Resumed session. ${Object.keys(anchors).length} projects in domain anchors.`);
  } else {
    // Try to load from Phase 1 output
    const phase1Files = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('interview-') && f.endsWith('.json'));
    for (const f of phase1Files) {
      const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf8'));
      if (data.phase === 1 && data.anchors) {
        anchors = data.anchors;
        break;
      }
    }
    if (Object.keys(anchors).length === 0) {
      console.log('No domain anchors found — scenarios will use placeholder text.');
      console.log('Run Phase 1 first: node nl-interview.js --phase 1');
    }
  }

  // Run the phase
  let scenarios;
  switch (phase) {
    case 2: scenarios = SCENARIO_BANK.phase2; break;
    case 3: scenarios = SCENARIO_BANK.phase3; break;
    case 4: scenarios = SCENARIO_BANK.phase4; break;
    case 5:
      console.log('Correction sweep: reviewing previously captured responses...');
      // Phase 5 loads prior responses and presents corrections
      if (resumeSession && fs.existsSync(resumeSession)) {
        const sessionData = JSON.parse(fs.readFileSync(resumeSession, 'utf8'));
        console.log(JSON.stringify(sessionData.responses || [], null, 2));
      }
      console.log('Correction sweep complete. Run intent map compiler to rebuild.');
      process.exit(0);
  }

  if (scenarios && scenarios.length > 0) {
    await runPhase(phase, scenarios, anchors, outputPath);
    console.log(`Output saved to: ${outputPath}`);
  }

  process.exit(0);
}

main().catch(e => {
  console.error(`Interview engine crashed: ${e.message}`);
  process.exit(1);
});
