# Windsurf Build Prompt — DTS Code Hub

Copy everything below into Windsurf as your project brief / system context.

---

## Project Identity

**Name:** DTS Code Hub
**Tagline:** Build • Collaborate • Innovate
**Description:** A self-hosted GitHub clone built by Developpement Team Studios (DTS). A full-featured collaborative code platform supporting version control, repository management, issue tracking, pull requests, and rich file rendering.

**Branding:** Dark theme, SVG-only iconography (no emojis anywhere in the UI), clean professional layout. Logo is a circular orbit motif (bunny silhouette + code brackets `</>`) in a blue→purple gradient on a near-black navy base. **Mascot: a bunny** (chosen specifically to avoid any resemblance to GitHub's Octocat mascot). DTS's designer has provided two logo variants as PNGs: a light-background version and a dark-background version (white outlines/text, for use in the dark nav/UI — this is the primary variant since the app's principal theme is dark). Use the dark variant throughout the app shell; reserve the light variant for any white-background contexts (e.g. marketing/email). SVG export of both is preferred for crispness at small nav sizes, but PNG is acceptable if SVG isn't available. Primary accent gradient: `#3B5BFE → #8B3BFE`. Background: near-black navy (`#0B0E14` / `#11141C`). Use this palette across buttons, active nav states, and highlights.

---

## Tech Stack

- **Frontend:** Vite + React + TypeScript + TailwindCSS
- **Desktop:** Electron wrapping the same Vite/React frontend — single codebase, two targets (web + desktop client)
- **Backend (data layer):** Supabase — Postgres database, Auth, Storage (uploaded images/zips/assets), Realtime (live notifications, collaborative editor)
- **Backend (git/CI layer):** A dedicated Node.js + Express + TypeScript service for anything needing a persistent process/filesystem access — the git engine, CI/CD runners, webhook delivery — talking to the same Supabase Postgres database
- **ORM:** Prisma, pointed at the Supabase Postgres connection string
- **Auth:** Supabase Auth (email/password + OAuth providers), JWT session handling, with custom claims for app-level roles
- **Git engine:** Server-side bare repositories on disk, manipulated via `isomorphic-git` (or `simple-git` wrapping system git) — exposed through a Git Smart HTTP-like API so real `git clone/push/pull` from a terminal works against DTS Code Hub
- **File storage:** Supabase Storage for user-facing assets (avatars, uploaded zips, images); local disk (`/repos`) reserved for bare git repositories only
- **Markdown rendering:** `react-markdown` + `remark-gfm` + `rehype-highlight` (or `shiki`) for code blocks
- **Image handling:** Serve binary directly when possible; base64-encode small images (<1MB) for inline embedding in API responses when requested
- **Language detection:** File-extension + heuristic byte-content classifier (linguist-style) to compute "top languages" per repo

---

## URL / Routing Scheme

DTS Code Hub follows GitHub's readable, path-based URL convention. Both the web app router and the API mirror this structure:

```
/{username}                                  → user profile
/{username}/{repo}                           → repo home (renders README)
/{username}/{repo}/blob/{branch}/{path}      → view a single file
/{username}/{repo}/tree/{branch}/{path}      → browse a folder
/{username}/{repo}/commits/{branch}          → commit history
/{username}/{repo}/commit/{sha}              → single commit diff
/{username}/{repo}/compare/{base}...{head}   → compare/diff view
/{username}/{repo}/issues                    → issues list
/{username}/{repo}/issues/{number}           → single issue
/{username}/{repo}/pulls                     → pull requests list
/{username}/{repo}/pull/{number}             → single PR + diff
/{username}/{repo}/wiki                      → wiki home
/{username}/{repo}/discussions               → discussions
/{username}/{repo}/releases                  → releases & tags
/{username}/{repo}/settings                  → repo settings (owner only)
/explore, /topics/{topic}                    → discovery pages
/{username}?tab=stars                        → starred repos, etc.
```

API routes mirror the same nesting (`/api/repos/:username/:repo/issues/:number`, etc.) so the relationship between resources stays obvious from the URL alone — important since git itself already addresses things by path (branch/blob path), so the web routing should feel native to anyone used to git.

---

## Full Feature Scope

### A. Core features (original request)

1. **Version control** — full git object model support (commits, branches, tags, trees, blobs)
2. **Git commands** — `push`, `pull`, `clone`, `merge` (both via real git client AND in-app UI actions)
3. **Repository management** — create, delete, rename, manage visibility (public/private), transfer ownership
4. **Upload a project** — drag-and-drop or zip upload that initializes a repo from existing files (e.g., an HTML project)
5. **Star repositories**
6. **Top languages used** — per-repo language breakdown bar (like GitHub's colored bar)
7. **User profiles** — avatar, bio, pinned repos, activity, follower/following
8. **Issues tracking** — create, comment, label, assign, open/close
9. **Pull requests** — diff view, comments, merge/close, conflict detection
10. **README / Markdown rendering** — auto-render `README.md` on the repo home page, plus any `.md` file viewed directly
11. **Image file rendering** — view images (png/jpg/svg/gif) inline in the file browser, with base64 fallback support

### B. AI-assisted development, automation & enterprise (provided by DTS)

12. **AI pair programming** — autocomplete suggestions and full-function generation while editing code in-app
13. **AI auto-fix for vulnerabilities** — generates fix suggestions for flagged security issues
14. **CI/CD pipelines** — `.dts-ci/workflows/*.yml` workflow files, triggered by push/PR/schedule/manual dispatch, running jobs on hosted runners
15. **Workflow marketplace** — reusable pre-built pipeline steps/actions contributable by the community
16. **Package hosting** — host build artifacts/packages alongside a repo, integrated with CI/CD
17. **Cloud dev environments** — one-click, fully configured cloud workspace per repo/branch, configurable via a `devcontainer.json`-style file
18. **Dependency update bot** — scans manifests, opens automated PRs to bump vulnerable/outdated packages
19. **Secret scanning** — detects committed API keys/tokens, can block the push before it lands
20. **Static code scanning** — CodeQL-style analysis for vulnerabilities and bug patterns
21. **CODEOWNERS** — auto-assigns reviewers based on file/path ownership rules
22. **Dependency graph visualizer** — maps a project's dependency tree and flags risk
23. **Advanced Security tier** — unlocks secret/code scanning + dependency insights on private repos
24. **PowerShell-friendly CI** — workflow steps support `shell: pwsh`, so Pester tests and deployment scripts run natively in pipelines

### C. Additional GitHub features (found via research)

**Repository & code**
25. Gists — standalone snippet sharing, separate from full repos
26. Wikis — per-repo documentation space distinct from the README
27. Static site hosting — auto-deploy a repo/branch as a live site (DTS Code Hub Pages)
28. Releases & tags — versioned releases with auto-generated changelogs and downloadable assets
29. Repository templates — "Use this template" to scaffold new repos
30. Forks + network graph — visual fork/branch lineage across the platform
31. Compare view — diff any two branches or commits
32. Blame view — line-by-line authorship history
33. Cherry-pick & revert via UI — apply or undo specific commits without the CLI
34. In-app code search — regex/symbol-aware search across one repo or all of DTS Code Hub
35. Git LFS & submodules support — large binaries and nested repo references
36. Archive / transfer ownership / mirror a repository

**Collaboration & social**
37. Discussions — forum-style Q&A, announcements, and polls, separate from Issues
38. Watch/unwatch + granular notification settings + email digests
39. Sponsorship/funding button (`FUNDING.yml`-style config)
40. Saved reply templates for common PR/issue responses
41. Profile README — special repo matching the username, rendered on the profile page
42. Contribution heatmap, streaks, and achievement badges
43. Explore/Trending page + repo Topics for discovery

**Repo health & process**
44. Branch protection rules — required reviewers, required status checks before merge
45. Draft pull requests, squash/rebase/merge-commit choice, auto-merge, merge queue
46. Community health files — `SECURITY.md`, `CONTRIBUTING.md`, Code of Conduct templates
47. Insights dashboard — Pulse, contributor graph, commit/code-frequency charts, traffic stats

**Access & platform**
48. SSH/GPG key management + "Verified" signed-commit badge
49. Two-factor authentication, OAuth apps, personal access tokens
50. Webhooks + REST/GraphQL API + installable platform apps (marketplace integrations)
51. CLI tool + desktop GUI client + mobile-friendly web app

### D. DTS Code Hub original features (creative additions)

52. **Repo health score** — auto-computed badge from README quality, license presence, recent activity, detected test coverage
53. **Live collaborative file editor** — see teammates' cursors editing a file in real time, in-browser
54. **Time-travel commit slider** — drag a slider to scrub the file tree visually through repo history
55. **Snapshot diff thumbnails** — for HTML/web projects, auto-render a visual screenshot diff between commits
56. **Bilingual UI (EN/FR)** — one-click site-wide language toggle, matching DTS's bilingual identity
57. **Bunny-mascot empty states** — Code Hub bunny mascot illustration in place of generic empty-state graphics

---

## Build Methodology (IMPORTANT — follow this exactly)

This project is being delivered in **phases**. Each phase has its own scoped plan that must be approved before code is written. Do **not** attempt to build the entire platform in one pass.

Rules for every phase:
- Implement only what is in the current phase's approved plan — no scope creep into future phases.
- Before delivering any file, validate syntax (e.g. `tsc --noEmit`, `node --check` equivalents, lint pass).
- Keep UI components dark-themed, with SVG-only icons (no emoji).
- Keep backend and frontend cleanly separated (`/server` and `/client` or a monorepo with `/apps/api` and `/apps/web`).
- Write code that is production-structured from the start (proper folder structure, typed models, no throwaway prototyping), even though we deliver incrementally.
- After each phase, summarize what was built, what's stubbed/mocked, and what the next phase depends on.

---

## Planned Phase Breakdown (high level — detailed scope defined per-phase before implementation)

- **Phase 0:** Project scaffolding & architecture foundation — monorepo, DB schema, auth skeleton, base UI shell/nav with logo, bilingual (EN/FR) toggle scaffold
- **Phase 1:** Authentication & user profiles — accounts, 2FA, SSH/GPG key management, OAuth apps/PATs, profile pages, profile README, contribution heatmap/streaks/badges
- **Phase 2:** Repository core — create/delete/manage, public/private visibility, transfer/archive/mirror, repo templates, project upload (incl. HTML projects), repo health score
- **Phase 3:** Git engine — real `clone/push/pull/merge` over Smart HTTP, cherry-pick & revert via UI, Git LFS & submodules, branch protection rules
- **Phase 4:** Repository file browser — README/Markdown rendering, image rendering, file tree navigation, blame view, compare/diff view, in-app code search, time-travel commit slider
- **Phase 5:** Stars, top-languages analytics & discovery — language bar, Explore/Trending, Topics, Insights dashboard (Pulse, contributors, traffic, code frequency), dependency graph
- **Phase 6:** Issues tracking — labels, milestones, assignees, CODEOWNERS auto-assignment, saved reply templates
- **Phase 7:** Pull requests — diffing, draft PRs, merge strategies, auto-merge/merge queue, conflict detection, snapshot diff thumbnails for web projects
- **Phase 8:** Discussions & social — forum-style Discussions, Watch/notifications, Sponsorship/funding button, community health files (SECURITY.md, CONTRIBUTING.md, CoC)
- **Phase 9:** Gists, Wikis & Pages — snippet sharing, per-repo wikis, static site hosting from a repo/branch
- **Phase 10:** Automation & CI/CD — workflow engine (`.dts-ci/workflows`), hosted runners, PowerShell (`pwsh`) step support, workflow marketplace, package hosting
- **Phase 11:** Security & dependency management — secret scanning, static code scanning, dependency update bot, Advanced Security tier for private repos
- **Phase 12:** AI-assisted development — AI pair-programming autocomplete, AI auto-fix suggestions for flagged vulnerabilities
- **Phase 13:** Cloud dev environments — one-click cloud workspace per repo/branch, `devcontainer.json`-style config
- **Phase 14:** Platform & integrations — webhooks, REST/GraphQL API, installable apps marketplace, CLI tool, desktop client packaging
- **Phase 15:** Polish & launch readiness — live collaborative file editor, remaining bunny-mascot empty states, performance pass, deployment readiness

Begin only when explicitly told which phase to implement, and only after that phase's detailed plan has been approved.