# Home summary contracts

Home is a read-only signal layer. It never owns the underlying record and it never writes to any source.

## Rota

Owner: `rota.html`.

Proposed published read-only summary: current/next duty window, recovery flag, and conflict flag. Home may use these only to shape capacity language; it must not infer a shift from absence of data.

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
