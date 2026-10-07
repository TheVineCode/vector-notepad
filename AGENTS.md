## Ticket-First Delivery

Follow this workflow for every implementation, bug fix, refactor, configuration change, and documentation task, including changes to this file.

1. Read `project-doc.md` for agreed scope and inspect the relevant code, worktree, and remote branch state. Read-only discovery and planning may precede tickets; start changes only after the ticket gate below is satisfied.
2. Use `gh` to find suitable existing issues or create small tickets in `TheVineCode/vector-notepad` before actioning the task. Split larger tasks into independently verifiable slices rather than one broad issue. A small, self-contained task may use one ticket. Each ticket must state scope, acceptance criteria, verification, and any blocking dependencies. Read `docs/agents/issue-tracker.md` for tracker operations and dependency links.
3. Select unblocked tickets and create a task branch before editing. Keep every change tied to a selected ticket. Ticket newly discovered scope before implementing it; preserve unrelated worktree changes.
4. Implement the selected tickets and run their verification checks. Update affected documentation to distinguish implemented behavior from plans. Record results and any remaining limitations on the tickets.
5. After the task's changes are complete and verified, review the full branch diff, commit only intended files, push the task branch, and create a PR with `gh pr create`. One PR may cover one ticket or multiple cohesive tickets depending on size and importance; isolate large or high-risk changes when independent review is valuable. Include scope, verification evidence, and `Closes #<number>` for every completed ticket. Issues remain open until merge. Return the PR URL and any blockers to the user.

Planning-only requests stop before implementation. Explicit user limits, such as no commit or no push, override delivery steps; report what remains instead of bypassing those limits. If GitHub access blocks ticket creation or PR delivery, report the blocker and resolve access or obtain an explicit exception before proceeding past that gate.

## Agent Skills

### Issue tracker

Issues and specs are tracked in GitHub Issues for `TheVineCode/vector-notepad`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage labels without overrides. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.
