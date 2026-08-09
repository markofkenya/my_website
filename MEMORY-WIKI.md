# Hermes Memory Wiki

> Durable pointers for this Hermes setup. This is an operational index, not a transcript, journal, credential store, or clinical record.
> Created: 2026-08-09. Review at the end of a meaningful build, a major decision, or monthly maintenance.

## 1. Current projects

**Belongs:** active projects, their intended outcome, current phase, authoritative locations, and one next verifiable milestone.

**Does not belong:** day-by-day progress narration, raw chat logs, task-by-task tool output, or stale completed work.

**Update:** when a project starts, changes scope, reaches a milestone, or closes.

**Private/excluded:** credentials, patient data, raw QBank question stems, personal communications, and unredacted logs.

**Example:** `Renal Recall Loop — active; next milestone: one supervised Quiz → Debrief → Recall ledger cycle.`

### Active
- **Renal Recall Loop** — error-led SCE learning system. Firebase tracker is canonical for QBank progress/errors; the Nephrology Coverage Ledger owns recall state. Telegram SCE Quiz/Debrief/Recall are the delivery surfaces. See [[Important decisions]] and [[Open loops]].
- **Learning Loop dashboard** — companion dashboard in the SCE tracker. It should show active QBank-error and recall signals, not a compulsory taxonomy-completion target. Main files: `SCE.html`, `sce-learning-dashboard.js`, `sce-ledger-projection.js`.
- **RonWeasley Telegram hierarchy** — Ron/default handles general matters; `sce` handles SCE topics; `admin` handles rota and portfolio topics.

## 2. Important decisions

**Belongs:** stable choices with rationale, source-of-truth assignments, named boundaries, and decisions that prevent future re-litigation.

**Does not belong:** tentative brainstorming, implementation minutiae, unverified claims, or hidden model assumptions.

**Update:** immediately after a user-approved architectural, clinical-safety, or data-ownership decision.

**Private/excluded:** access tokens, private identifiers, medical records, and sensitive personal rationale not needed to operate the system.

**Example:** `Firebase is canonical for QBank errors; never duplicate it into a second error tracker.`

- **One effective SCE system:** Firebase = QBank record; ledger = recall state; Telegram = interaction; dashboard = read-only decision surface.
- **Taxonomy is guidance, not a quota:** KSAP concepts and 10 main topics classify/select learning; they are not an all-concepts coverage target.
- **Cards are error-led:** create 1–3 cards only from meaningful Firebase QBank misses/errors/wrong answers or weak Cold Case + MCQ performance.
- **Study² is the deep-learning escalation:** repeated lapses should trigger a decision drill, Study² mini-viva, or teach-back rather than duplicate cards.
- **Evidence monitoring is separate and lower priority:** use original KDIGO, UKKA, NICE, and major-trial sources; label items `exam-relevant` or `good-to-know`.

## 3. Useful outputs and where they live

**Belongs:** durable artifacts, repository paths, dashboard locations, and concise status/purpose.

**Does not belong:** copies of file contents, secrets, temporary artifacts, build caches, or transient command output.

**Update:** on creation, move/rename, major replacement, or archive.

**Private/excluded:** `.env`, OAuth files, auth databases, raw exports containing sensitive data, and Telegram chat identifiers.

**Example:** `Coverage ledger schema: curriculum/coverage-ledger-config.json.`

- **SCE tracker/dashboard repository:** `/root/my_website` — GitHub repository `markofkenya/my_website`.
- **Coverage-ledger configuration:** `curriculum/coverage-ledger-config.json` — points to the Google Sheet and defines its canonical role.
- **Ledger → dashboard sync:** `curriculum/scripts/sync-ledger-dashboard.mjs` — reads Sheets and writes aggregate projection to Firebase `sceData/hermesDashboard`.
- **Dashboard projection logic:** `sce-ledger-projection.js`.
- **Dashboard client view:** `sce-learning-dashboard.js`, loaded by `SCE.html`.
- **Tests:** `tests/sce-ledger-projection.test.js`, `tests/sce-learning-dashboard.test.js`, `tests/sync-ledger-dashboard.test.js`.
- **SCE profile instructions:** `/root/.hermes/profiles/sce/SOUL.md`.

## 4. Reusable workflows

**Belongs:** stable end-to-end workflows with input, decision point, output, and a link to the operating artifact.

**Does not belong:** one-off experiments, loose ideas, raw prompts without a verified use case, or automation not yet audited.

**Update:** after an end-to-end workflow is verified or materially revised.

**Private/excluded:** patient-specific material, copyrighted QBank content, secrets, and raw source dumps.

**Example:** `Post-question learning: error → debrief → up to three cards → spaced recall.`

### SCE error-led recall loop
1. User records a meaningful QBank miss/error/wrong answer in Firebase, or performs weakly in a Cold Case + MCQ.
2. Classify it with the KSAP taxonomy.
3. Debrief the decision point and misconception.
4. Create at most three cards: core, decision/discriminator, and optional exception/threshold.
5. Deliver due cards only in SCE Recall; record Again/Hard/Good/Easy.
6. Escalate repeated lapses to a decision drill, Study² mini-viva, or teach-back.
7. Sync aggregate ledger state to the Learning Loop dashboard.

### Study² format
- Ask tiered questions without answers.
- Run one-question-at-a-time viva without mid-viva confirmation.
- End with scored structured debrief, gaps, source pointers, and transfer case.

## 5. Skills and procedures

**Belongs:** installed skill names, when to use them, and short verified operational notes.

**Does not belong:** full copies of skills, undocumented commands, model-provider secrets, or untested recipes.

**Update:** when a skill is added, materially corrected, or becomes obsolete.

**Private/excluded:** credentials and any local paths that expose private source data.

**Example:** `study-systems — use for tracker/ledger/Telegram workflow design; preserve the tracker as source of truth.`

- **`study-systems`** — design/maintain tracker → ledger → messaging workflows; preserve Firebase QBank ownership.
- **`clinical-learning-workflows`** — Study², active recall, decision drills, teach-back, and evidence-digest boundaries.
- **`hermes-agent`** — Hermes profiles, gateways, configuration, routing, cron, and troubleshooting.
- **`systematic-debugging` + `test-driven-development`** — use for software faults and dashboard/sync changes.
- **`llm-wiki`** — governs this wiki’s durable-pointer approach; orient from this file before substantial wiki changes.

## 6. Open loops

**Belongs:** unresolved work with an owner/context, a clear next action, and a completion criterion.

**Does not belong:** vague wishes, permanent background aspirations, duplicated task lists, or already completed work.

**Update:** whenever status changes; remove or archive on completion.

**Private/excluded:** sensitive personal reminders unless explicitly requested.

**Example:** `Implement supervised vertical slice; complete when the dashboard shows a new attempt and due card.`

- **Supervised SCE vertical slice:** implement and verify one real event from QBank/Cold Case → Quiz → Debrief → ledger Attempt → targeted Cards → Recall rating → dashboard update.
- **Dashboard active-error model:** remove any implication that `never delivered` is a deficit; show active QBank errors, weak concepts, due cards, pending debriefs, and repeated lapses.
- **Firebase-to-ledger intake:** define a safe, auditable method to turn user-entered Firebase errors into candidate debriefs without copying proprietary QBank stems.
- **Guideline/trial update workflow:** create only after the core vertical slice is reliable; require original sources and no noisy automation.
- **Schedules:** decide Quiz and Recall cadence only after two weeks of audited real use.

## 7. Safety rules and approval boundaries

**Belongs:** durable data, clinical-safety, privacy, and action-approval constraints.

**Does not belong:** generic boilerplate, credentials, or every historical approval.

**Update:** when a new integration, external write, or risk boundary is introduced.

**Private/excluded:** secret values, identifiable clinical details, and raw source text.

**Example:** `Never place a webhook secret in client-side GitHub Pages code.`

- Never store credentials, tokens, `.env` contents, auth files, patient data, or raw QBank stems in this wiki.
- Firebase QBank data is canonical; the ledger must not silently overwrite or duplicate it.
- Obtain approval before creating external resources, posting study messages, scheduling recurring jobs, writing Sheets/Docs, or sending communications.
- Use original guidelines/trials for clinically consequential claims; distinguish educational support from patient-specific advice.
- Do not automatically schedule all taxonomy concepts. Taxonomy guides classification only; recall is generated from actual errors and weak performance.
- Keep public dashboard data aggregate and non-sensitive; no private source content or secrets in browser code.

## Maintenance note

At the start of a substantial Hermes session, read this file and inspect the named current-project artifacts before proposing a new architecture. Update concise pointers, decisions, and open loops—not raw conversation history.
