# 14: Grade targets

Goal: answer what remaining grades are needed to reach a target GWA. Depends on spec 09.

Stories, each requiring a real E2E scenario:

1. A student enters a target and sees the required weighted average across remaining graded units, with assumptions visible.
2. Impossible targets, no remaining units, no grades, and invalid inputs have explicit states rather than misleading numeric results.
3. Changing a grade or units updates the projection consistently with existing GWA calculations.

Plan: confirm the supported institutional grading scale, rounding, exclusions, and remaining-unit definition before implementation. Current code has a fixed scale. Broader configurable grading is a separate decision, not an implied rewrite.

Test: hand-calculate weighted examples and impossible bounds. Real E2E covers saved subject changes and projection updates. Mutation: use an unweighted mean and confirm failure.

Status: product decision required. No prediction model or recommendation engine.
