# Timing Model Requirements

## What To Implement

Implement a fixed Melbourne-style station timer.

The station always follows this sequence:

```text
Scenario reading: 30 seconds
Q1 preparation: 15 seconds
Q1 answer: 60 seconds
Q2 preparation: 15 seconds
Q2 answer: 60 seconds
Q3 preparation: 15 seconds
Q3 answer: 60 seconds
Q4 preparation: 15 seconds
Q4 answer: 60 seconds
Station complete
```

There are always four questions.

## How To Implement

Use a state machine or equivalent explicit phase model.

Recommended phases:

```text
scenario_reading
q1_prep
q1_answer
q2_prep
q2_answer
q3_prep
q3_answer
q4_prep
q4_answer
complete
```

During each phase, show:

```text
Current phase label
Current question where relevant
Countdown in seconds
Recording status where relevant
```

The timer should advance automatically from phase to phase.

## Completion Criteria

Timing is successful when:

```text
1. The sequence always starts with 30 seconds of scenario reading.
2. Each question has exactly 15 seconds preparation.
3. Each answer has exactly 60 seconds recording time.
4. The UI clearly shows current phase and remaining time.
5. The station reaches completion after Q4 answer.
6. The timing values are written to metadata.json.
7. Audio segment offsets in metadata match the fixed answer timing.
```

Small JavaScript timer drift is acceptable, but the user-facing timer should behave consistently and predictably.

## If Implementation Fails

If the timer skips or repeats a phase:

```text
1. Return to the phase model.
2. Add explicit phase order tests or manual console checks.
3. Verify all nine phases occur exactly once before completion.
```

If the UI does not clearly show the current phase:

```text
1. Make phase label more prominent.
2. Keep countdown visible at all times during practice.
3. Show question text only for the current question.
```

If timing and recording disagree:

```text
1. Use the answer phase transitions as the source of truth.
2. Ensure recording starts at Q1 answer.
3. Ensure recording stops after Q4 answer.
```

