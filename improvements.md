# Improvements Log (Career-Ops)

## Scope
This file tracks the key engineering improvements implemented so far across backend, pipeline reliability, and frontend UX.

## 1) Fail-fast URL validation before LLM processing
- Added a token-free HTTP validation layer (`backend/active-gate.mjs`) to classify pending links as `active`, `skipped_expired`, or `skipped_unconfirmed`.
- Expired links are removed from `data/pipeline.md` before they reach expensive evaluation steps.
- Results are appended to `data/scan-history.tsv` for auditability.
- Impact from real runs:
  - 36 pending -> 23 active after initial gate pass.
  - 23 pending -> 21 active after phrase hardening.
  - Net: 36 -> 21 active roles, ~42% reduction in unnecessary pipeline load.

## 2) Expired-link detection hardening (Google/portal edge cases)
- Expanded expired phrase detection to catch portal messaging like:
  - `job not found`
  - `this job may have been taken down`
  - `may have been taken down`
- This removed stale Google jobs still visible in pending.

## 3) Deterministic test coverage for the liveness gate
- Added `backend/test-active-gate.mjs` with deterministic unit tests (parser + rebuild + signal detection).
- Test suite is network-free and file-I/O-free by design.
- Current status: `20 passed, 0 failed`.

## 4) Safety fix: prevent test side effects
- Fixed `active-gate.mjs` so `main()` runs only on direct CLI execution.
- Importing the module in tests no longer triggers live scans or file writes.

## 5) Backend/Frontend structure cleanup
- Standardized repository layout to top-level `backend/` and `frontend/`.
- Removed duplicated/legacy root-layout files to reduce clutter and storage usage.

## 6) Profile and job-search configuration bootstrap
- Added and aligned candidate config/data for SWE1/SDE1 targeting:
  - `backend/config/profile.yml`
  - `backend/cv.md`
  - `backend/portals.yml`
  - `backend/modes/_profile.md`
  - `backend/data/*` (applications/pipeline/scan-history)
- Included policy to avoid skipping purely due course mismatch.

## 7) Frontend dashboard foundation
- Added/organized pages and APIs to visualize pipeline, applications, scan history, and stats.
- Frontend now reads backend data and presents it in a navigable dashboard UI.

## 8) Browser chat interface for local Claude CLI
- Added `/chat` UI in frontend for direct interaction with local Claude CLI.
- Added streaming proxy routes:
  - `POST /api/claude/chat`
  - `POST /api/claude/stop`
- Added docs: `frontend/docs/CLAUDE_CHAT.md`.
- Verified build/tests for frontend pass.

## 9) Known gaps identified for immediate fix
- Chat history is not keyed by `sessionId` (single global localStorage key).
- Backend working-directory resolution in chat API is brittle.
- No guaranteed child-process cleanup on client disconnect.
- Stop endpoint depends on in-memory process map (fragile across multi-instance runtime).

## 10) Summary
The project now has a practical reliability layer that prevents obvious dead links from consuming LLM resources, a cleaner repo structure, and a usable frontend workflow (including browser-based Claude chat). The next step is hardening the chat backend for robust process/session handling.
