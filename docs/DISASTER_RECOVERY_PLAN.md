# PrivacyLayer Disaster Recovery Plan

## Purpose

This document defines how PrivacyLayer should prepare for, respond to, and
recover from operational incidents that threaten:

- user funds
- user privacy
- contract availability
- deployment integrity
- project communication and trust

The current repository is still pre-production and unaudited. Even so, a
project handling privacy-sensitive contracts should not wait until after launch
to define recovery expectations.

## Objectives

The disaster recovery plan is designed to achieve five outcomes:

1. Detect incidents quickly enough to limit harm.
2. Freeze unsafe operations before damage spreads.
3. Preserve the evidence needed to diagnose what happened.
4. Restore service in a controlled way.
5. Communicate clearly with users, contributors, and reviewers throughout the
   incident lifecycle.

## Scope

This plan applies to:

- Soroban contract deployments under `contracts/privacy_pool/`
- Noir circuits under `circuits/`
- proving and verification configuration
- repository documentation that guides user behavior
- any future SDK, frontend, relayer, or deployment automation added around the
  protocol

## Severity Levels

### Severity 1: Critical

Examples:

- suspected fund theft
- nullifier replay or double-spend path
- forged withdrawal proof accepted
- malicious verifying-key update
- compromised admin key with active protocol control

Expected response:

- immediate freeze or pause decision
- named incident lead
- no new deployment activity without explicit approval

### Severity 2: High

Examples:

- privacy leak with no confirmed fund loss
- root-history corruption or withdrawal failures
- release artifact mismatch
- broken deployment that blocks deposits or withdrawals

Expected response:

- same-day response
- explicit public status update if users are affected

### Severity 3: Medium

Examples:

- backup job failure without current evidence of data loss
- monitoring blind spots
- documentation or runbook gaps discovered during rehearsal

Expected response:

- tracked remediation with owner and deadline

## Risk Assessment

The highest-value disaster scenarios for PrivacyLayer today are:

### 1. Contract state integrity failure

Risks:

- corrupted config values
- invalid verifying key
- root-history mismatch
- nullifier state inconsistency

Impact:

- blocked withdrawals
- false proof acceptance or rejection
- fund-safety uncertainty

### 2. Admin-key compromise

Risks:

- malicious pause/unpause
- verifier replacement
- hostile config update

Impact:

- protocol takeover
- user trust collapse
- forced redeploy or migration

### 3. Privacy incident without direct theft

Risks:

- metadata or timing leak
- frontend or operator workflow deanonymization
- accidental publication of sensitive process details

Impact:

- user privacy damage
- reputational harm
- need for urgent guidance even if funds remain safe

### 4. Build or deployment compromise

Risks:

- release artifact does not match source
- dependency or CI compromise
- operator deploys wrong circuit or verifier material

Impact:

- unverifiable release
- unsafe production state
- inability to trust rollback assets

### 5. Repository or infrastructure loss

Risks:

- accidental deletion of deployment notes or runbooks
- lost test snapshots
- unavailable communications channels

Impact:

- slower diagnosis
- delayed recovery
- inconsistent operator actions under pressure

## Roles and Responsibilities

Every incident should assign the following roles explicitly:

- **Incident lead**: owns decisions and timeline
- **Technical lead**: validates root cause and patch direction
- **Communications lead**: publishes user-facing updates
- **Recorder**: captures timeline, commands, hashes, and decisions

If the team is small, one person may hold more than one role, but the role
names should still be declared at the start of the incident.

## Preparedness Checklist

Before any production deployment, the project should have:

- hardware-backed admin key storage
- documented key-rotation procedure
- copy of the active verifier configuration and deployment metadata
- offline copies of critical runbooks
- defined public status/update channels
- test environment capable of reproducing contract incidents

## Backup Strategy

Disaster recovery is not only about code backups. PrivacyLayer should preserve
the information needed to understand and recover from an incident.

### Items to back up

- release tags and deployment commit hashes
- contract configuration snapshots
- verifier-key material and provenance
- incident runbooks and security docs
- test snapshots and reproducible failure cases
- release notes for each deployed version

### Backup rules

- Keep at least one offline or separately controlled copy of critical release
  metadata.
- Store recovery docs somewhere other than a single developer laptop.
- Do not rely on ad-hoc shell scripts that mutate the working tree during a
  crisis.
- Treat deployment metadata as recovery-critical, not optional paperwork.

### What not to back up carelessly

- private keys in plaintext
- user secrets or note material
- raw secrets embedded in chat logs or issue comments

## Detection and Triage

Incident triggers include:

- unexpected withdrawal failures
- duplicate nullifier alarms
- unauthorized or surprising admin activity
- mismatch between deployed artifact and reviewed source
- user reports of privacy leakage or missing funds

When an alert arrives:

1. Open an incident record immediately.
2. Label severity conservatively high until disproven.
3. Freeze non-essential releases and merges affecting the same area.
4. Capture all known facts before improvising fixes.

## Immediate Response Procedures

### Contract or fund-safety incident

1. Determine whether pause authority should be exercised.
2. Snapshot relevant state: config, roots, nullifiers, and current deployed
   commit.
3. Identify the last known good release.
4. Preserve logs, transaction hashes, and reproduction input.

### Privacy incident

1. Determine whether the issue affects confidentiality, availability, or both.
2. Stop publishing misleading privacy claims while investigation is ongoing.
3. Draft user guidance quickly, even if root cause is still under review.

### Deployment compromise

1. Halt further deployments.
2. Verify artifact hashes against tagged source.
3. Rotate CI or operator credentials if compromise is plausible.
4. Rebuild from a trusted environment before any redeploy.

## Recovery Procedures

### Restore from known-good state

Use only if the team can verify:

- which commit is trusted
- which verifying key is trusted
- which configuration values were active

Restore checklist:

1. Rebuild from the known-good source state.
2. Confirm artifact provenance.
3. Re-run contract and circuit verification steps.
4. Review the rollback with at least one other maintainer before executing.

### Patch-and-redeploy

Use when the root cause is understood and a rollback is insufficient.

Patch checklist:

1. Write the root cause in one paragraph before coding.
2. Add regression coverage for the exact failing path.
3. Update the threat model or operational docs if assumptions changed.
4. Prepare rollback instructions before shipping the fix.

### Key compromise response

1. Assume any action available to the compromised key may have been abused.
2. Rotate keys through a pre-agreed emergency path.
3. Review all recent admin actions, not just the one that triggered the alarm.
4. Publish a post-rotation summary once the system is stable.

## Communication Plan

Poor communication creates secondary damage. Users need to know:

- what happened
- whether funds are at risk
- whether privacy is at risk
- what actions they should avoid
- when to expect the next update

### Communication rules

- Use one canonical incident thread or status page per incident.
- Prefer short factual updates over speculation.
- State unknowns explicitly.
- Never overstate certainty or safety while evidence is incomplete.

### Minimum update cadence

- Severity 1: initial acknowledgement as fast as possible, then regular updates
  until containment
- Severity 2: same-day acknowledgement plus scheduled follow-up
- Severity 3: tracked internally unless users are directly affected

## Testing and Recovery Drills

A recovery plan that is never rehearsed is only half real.

Recommended drills:

- verifying-key mismatch rehearsal
- paused-contract communication drill
- build-from-known-tag restoration drill
- admin-key rotation tabletop exercise
- failed-withdrawal incident simulation

Each drill should answer:

- Did the team know who was in charge?
- Could the team find the right artifacts quickly?
- Were the instructions complete enough to follow under stress?
- Did communications accurately describe user impact?

## Post-Incident Review

Every significant incident or drill should result in:

- a short timeline
- the root cause or current best explanation
- what worked
- what failed
- concrete follow-up owners and deadlines

The post-incident review should update at least one of:

- code
- tests
- threat model
- contributor guide
- disaster recovery plan

## Recovery Success Criteria

An incident is not fully resolved just because the service is online again.
PrivacyLayer should consider recovery complete only when:

- the unsafe condition is contained
- the root cause is understood well enough to prevent recurrence
- rollback or patch provenance is documented
- users have been informed appropriately
- follow-up remediation tasks are tracked publicly or internally

## Current Gaps

Based on the present repository state, the biggest recovery gaps are:

- no dedicated disaster recovery document before this change
- heavy reliance on future operational maturity that is not yet documented
- strong trust assumptions around admin and verifier management
- unclear production backup and artifact provenance process

These gaps do not block development work, but they do block any claim that the
project is operationally ready for production privacy-sensitive deployment.
