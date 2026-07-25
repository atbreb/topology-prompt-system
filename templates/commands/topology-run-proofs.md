# topology-run-proofs

Headless proof execution — runs the named proofs from FUTURE-STATE.md assertion tables. CI-safe.

## Usage
```
/topology-run-proofs <project-name> <category-slug>
```

## Prerequisites

Run: `/topology-ready <project-name> --action project-read`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Extract proofs
Read `FUTURE-STATE.md` assertion table. Filter to proof kinds: test, property, lockdown. Extract the proof target (e.g., `go test -run TestX`, `pnpm test -- -t "name"`).

### Step 2: Execute
Run each proof. Capture exit code and output.

### Step 3: Return
```
| Assertion | Proof | Ran | Exit | Output |
|-----------|-------|-----|------|--------|
| A1 | go test -run TestRoleInfer | ✅ | 0 | PASS |
| A2 | pnpm test -- -t "ranking" | ✅ | 0 | PASS |
```

Exit 0 if all proofs pass, 1 if any fail.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer.
