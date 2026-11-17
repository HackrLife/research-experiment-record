# Does a second verification pass improve lead qualification?

## Research question

Does a verifier improve agreement with a human-reviewed lead qualification rubric at a fixed budget?

## Hypothesis

A separate verifier will improve rubric agreement by at least 5 percentage points.

## Baseline

One agent classifies the lead using the qualification rubric.

## Variants

The same agent classifies the lead, then a verifier checks its evidence and can revise the label.

## Dataset

A frozen sample of 100 synthetic lead records, split evenly across four rubric categories.

## Protocol

Run each condition three times on the same sample. Fix model version and temperature across both conditions. Compare runs against the same human-reviewed labels.

## Metrics

Measure rubric agreement, false acceptance rate, and both median and p95 latency. Advance the variant if agreement rises by at least 5 points and the false acceptance rate stays within 2 points of baseline.

## Budget

Cap the first study at USD 50. Log actual spend and elapsed time per condition.

## Evidence

Record the rubric version, anonymized run logs, and scoring notebook here.

## Next steps

Freeze the sample and rubric before running either condition.
