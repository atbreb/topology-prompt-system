<!-- Seeded skeleton. topology-init generates this per project from your source material (Step 6). -->

# System Topology

> All seams start as Proposed. A seam becomes Verified only after both participating
> categories pass topology-verify for that seam.

## Seam 1 — <Producer Category> → <Consumer Category>

**Status:** Proposed
**Producer:** <category>
**Consumer:** <category>
**Ownership:** <category> owns the producer side

### What Crosses
`<TypeName> { field1, field2, ... }`

### Producer Guarantees
- <Explicit commitment 1>
- <Explicit commitment 2>

### Consumer Can Depend On
- <What is safe to rely on>

### Consumer Cannot Assume
- <What must not be relied upon>

### Verification Criteria
- [ ] Producer always emits <X> before crossing boundary
- [ ] Consumer never reads <Y> that wasn't guaranteed

## Seam Index

| Seam | Producer | Consumer | Status |
|------|----------|----------|--------|
| S1 — <title> | <cat> | <cat> | Proposed |
