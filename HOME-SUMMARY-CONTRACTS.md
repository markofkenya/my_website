# Home summary contracts

Home is a read-only signal layer. It never owns the underlying record and it never writes to any source.

## Rota

Owner: `rota.html` / InstaRota.

Home must not read the rota room directly. The room contains a complete shared schedule and private syncing context. Locations, times, leave reasons, colleague identity, rota code, notes, and raw schedule entries remain in InstaRota.

For the user-approved authenticated private Home view, InstaRota may additionally publish a seven-day per-UID rota projection containing only each calendar date and a closed set of duty labels: `ward`, `clinic`, `procedure`, `oncall`, `night`, `annual_leave`, or `study_leave`. This projection must be written and read only at `homePrivate/{auth.uid}/rotaWeek` after Firebase Google authentication. It must not include a source-room path, names, locations, times, free text, leave reasons, or other raw rota fields.

The future published read-only Rota aggregate may contain only:

```text
today.dutyState              = on-call | clinical | leave | recovery | unavailable
today.capacity               = protected | limited | normal | unavailable
today.conflict               = true | false
week.workload                = protected | limited | normal | unavailable
week.recovery                = true | false
week.protectedStudyWindow    = true | false
week.nextDutyProximity       = imminent | upcoming | none | unavailable
attention.conflict           = true | false
attention.recoveryProtection = true | false
```

Except for the user-approved authenticated private-week projection described above, no dates, locations, shift labels, leave type/reason, colleague identity, rota code, notes, or raw schedule entries may be written to or rendered by Home. Home uses the aggregate only to shape capacity language and priority; it must not infer a shift from absence of data.

## SCE

Owner: Firebase QBank tracker plus the learning ledger.

Published read-only summary: cards due, weak concepts, pending debriefs, and one safe next-action label. Home must not render stems, raw errors, taxonomy targets, or source identifiers.

## Portfolio

Owner: `ARCP.html`.

ARCP remains the portfolio record. The published read-only summary contains safe readiness bands for renal, GIM, CiP, admin and logbook, plus ALS/annual-evidence/procedure risk flags and one approved next-best-action label. It must not contain evidence text, dates, counts, identifiers, or personal data.

## Task Monitor

Owner: `index.html`.

Proposed read-only summary: count-free urgency state, one next action, and blocked/conflict flags. No task text or patient data is exposed in Home.

## Calendar

Owner: future approved calendar source.

Proposed read-only summary: availability band, conflict flag, and protected study-window flag. Calendar is intentionally unavailable until an approved read-only source exists.

## Evidence inbox

Telegram notes may become draft portfolio/reflection entries only after explicit user approval. Home may surface the existence of an approval queue, never create or publish evidence itself.
