# General Skill: Requirement Implementation Loop

## Purpose

Use this loop whenever an AI implements a change from this requirements folder.

The goal is to behave like a careful implementation agent:

```text
Understand the requirement
Inspect the current project
Make the smallest coherent change
Verify against success criteria
Fix failures by returning to the requirement
Report the result clearly
```

## Core Rule

The requirement file is the source of truth.

If the implementation and the requirement disagree:

```text
1. Re-read the requirement.
2. Identify the exact section being violated.
3. Modify the implementation to match the requirement.
4. Re-test the relevant success criteria.
```

## Standard Loop

## 1. Read

Before changing code, read:

```text
1. The requested version-change requirement file.
2. Any base requirement files it references.
3. The current implementation files affected by the change.
```

Do not rely only on memory of the project.

## 2. Restate

Create a short internal summary:

```text
Problem:
Target behaviour:
Affected areas:
Success criteria:
```

Use this to avoid implementing the wrong thing.

## 3. Inspect

Inspect the current code and UI structure.

Identify:

```text
Where the relevant UI is rendered
Where state is stored
Where files are saved
Where validation happens
Where timing or recording logic happens, if relevant
```

## 4. Implement

Make the smallest coherent change that satisfies the requirement.

Prefer:

```text
Existing project patterns
Clear state flow
Small functions with direct names
User data preservation
Readable validation and error messages
```

Avoid unrelated refactors.

## 5. Verify

Run every completion criterion from the requirement file.

For each criterion, record whether it passes:

```text
Pass
Fail
Not tested, with reason
```

When possible, verify end-to-end rather than only by reading code.

## 6. Fix

If any criterion fails:

```text
1. Name the failed criterion.
2. Map it to the relevant requirement section.
3. Fix the smallest failing layer.
4. Re-run the failed criterion.
5. Re-run nearby regression checks.
```

Continue until the requirement passes or a true blocker is found.

## 7. Report

Final report should include:

```text
What changed
Which files changed
What was verified
Any criteria not tested and why
Any known limitation or follow-up
```

Do not claim success if required verification was not performed.

## End-To-End Check Pattern

For the MMI practice tool, prefer this end-to-end check whenever relevant:

```text
1. Open the app.
2. Select or confirm save folder.
3. Select a module.
4. Enter or paste station content.
5. Start the station.
6. Confirm timer phases.
7. Confirm microphone recording behaviour.
8. Complete reflection.
9. Save session.
10. Inspect saved files.
```

If a change only affects one part of the flow, still run enough nearby checks to prove the full app did not regress.

## Failure Handling Standard

When something fails, the implementation should:

```text
Preserve user-entered data where possible
Show a clear user-facing message
Avoid false success states
Allow retry when reasonable
Keep the user in the current flow instead of discarding work
```

## Success Standard

A change is done only when:

```text
The target behaviour is implemented
All completion criteria pass or are honestly marked untested with reason
Existing core flows still work
The final report is precise
```

