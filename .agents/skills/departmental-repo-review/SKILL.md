---
name: departmental-repo-review
description: Use when a repository needs an evidence-based scorecard from multiple departments, with independent reviews and cross-challenge before a consensus report.
---

# Departmental Repository Review

## Purpose

Run a read-only, cross-functional repository review when the user asks for several departments or roles to assess a repository, debate findings, score it, or recommend improvements. The final report should reflect claims that survive review, with unresolved dissent stated plainly.

Use this for repository-level assessments. Do not use it for routine single-file code review, implementation tasks, or when the user asks for one specific technical answer.

## Working rules

- Follow the repository's instructions and the user's scope. Use repository-specific navigation guidance first, such as CodeGraph when required by `AGENTS.md`.
- Treat reviews as read-only by default. Do not edit files, run tests, benchmarks, scans with material side effects, deploy, or contact external parties unless the user asked for that work.
- Prefer source evidence with exact paths and line numbers. Label conclusions as static source findings, runtime-verified findings, measured performance, or hypotheses.
- Do not convert an agent's assertion into fact. The chair verifies high-severity or disputed claims against the repository before publishing them.
- A vote is not evidence. Keep a high-impact finding when its evidence is strong even if another reviewer missed it; retain dissent when evidence remains ambiguous.
- Limit the panel to the smallest set of useful roles. Default to three reviewer subagents plus the chair; adapt roles to the repository and available concurrency. If delegation is unavailable, disclose that and do not pretend a debate occurred.

## Review workflow

### 1. Set scope and scoring

Record the repository, branch/commit, user objective, permitted actions, and whether the review is static or includes execution. Preserve an existing score rubric when continuing an earlier review. Otherwise define the score dimensions and aggregation method before collecting ratings.

Ask reviewers to score only their area. Compute an overall score only with an explicit method. If using an equal-weight average, say so. Report a critical security or data-loss risk separately so the average cannot hide it.

### 2. Dispatch independent reviewers

Use `collaboration.spawn_agent` for parallel reviewers when available and authorized. Give each reviewer the same scope and evidence limits, but a distinct department role. A useful default panel is:

- **Engineering / architecture:** boundaries, maintainability, correctness, data flow.
- **Security / reliability / QA:** access control, state integrity, failure handling, release checks.
- **Product / UX / operations:** key user flows, accessibility, observability, deployment and docs.

For each reviewer, request a concise report with:

1. Area score from 0 to 10 and its brief rationale.
2. Up to five findings, ranked by impact, each with severity, exact source evidence, user/business impact, confidence, smallest useful fix, and rough effort.
3. Positive evidence and material limitations.
4. Explicit distinction between confirmed behavior and impact that depends on data, traffic, or runtime conditions.

Do not give reviewers another department's conclusions before their independent pass is complete.

### 3. Run a cross-challenge round

After all initial reports arrive, send each reviewer a concise digest of the other findings. Ask them to:

- challenge weak evidence, severity, scope, and proposed fixes;
- identify findings they independently corroborate;
- revise their score if warranted;
- state one disagreement or confirm there is none.

Allow up to two cross-review rounds. Stop when every top-priority finding has a disposition and a further round is unlikely to change the result. Do not keep polling unchanged agents.

### 4. Adjudicate findings

The chair checks the highest-impact claims against current source or other read-only evidence. For each P1, critical, or disputed finding, independently retrieve and verify the cited primary source and relevant call path in the current checkout; reviewer-provided excerpts or citations alone do not satisfy this check. Use the repository's required navigation tools first. Check call sites and data flow before treating a suspicious helper or dead code as a production defect. When agents disagree, record the evidence and classify the claim as:

- **Confirmed:** the relevant control flow or behavior is visible in source, or reproduced with an authorized check.
- **Conditional:** the code path exists but impact depends on volume, configuration, access to an identifier, or another stated condition.
- **Unverified / disputed:** evidence is incomplete or reviewers disagree without a decisive check.

Keep severity separate from confidence. Do not call a source-level risk an exploited vulnerability or measured performance regression without runtime evidence.

### 5. Produce the consensus report

Write in the user's language. Include:

- repo snapshot and review limits;
- overall score, department scores, and score calculation;
- strongest findings in priority order, with evidence and practical fixes;
- what won the debate and why;
- material dissent or claims downgraded after checking;
- positive evidence;
- tests, benchmarks, or runtime checks that were not performed.

The winning conclusion is the set of findings best supported after challenge, not the most popular opinion. Do not claim unanimous agreement unless every reviewer explicitly agreed.

## Reviewer prompt pattern

> Review [repository] as [department role]. This is an independent, read-only pass for [user objective]. Follow repository instructions and use available code-navigation tools first. Do not edit files or run tests/benchmarks. Return an area score, up to five ranked findings with exact path/line evidence, impact, confidence, smallest fix and effort, plus positives and limitations. Separate source-confirmed behavior from runtime or volume-dependent impact.

## Common review traps

| Trap | Correction |
|---|---|
| Averaging scores without stating the formula | Define the rubric and calculation before synthesis. |
| Treating repeated claims as independent proof | Verify the source path and caller/callee chain. |
| Calling a data-dependent risk a measured defect | State the condition and what measurement is missing. |
| Fixing every low-confidence suggestion in the report | Keep the backlog limited to supported, prioritized findings. |
| Declaring consensus because no one replied | Record non-response; do not count it as agreement. |
| Reporting the first round as the debate result | Include the cross-challenge and any score revisions. |
