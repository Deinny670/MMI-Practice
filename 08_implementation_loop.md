# Implementation Loop For AI

## Purpose

This file tells the implementation AI how to build and self-check Wave 1.

The goal is not merely to produce UI. The goal is to deliver the core practice experience:

```text
Open HTML
Choose save folder
Choose module
Enter scenario and four questions
Run timed station
Record spoken answers
Write reflection
Save complete local session folder
```

## Required Build Order

Implement in this order:

```text
1. Storage model and settings
2. Home screen and module selection
3. Practice setup form
4. Timing model
5. Recording behaviour
6. Reflection flow
7. Full session save
8. Manual end-to-end verification
```

Do not treat later screens as complete until the full loop saves the expected files.

## Requirement Reference Map

Use these files as the source of truth:

```text
00_context_wave1_high_level_design.md
01_storage_model_requirements.md
02_home_screen_requirements.md
03_practice_setup_requirements.md
04_timing_model_requirements.md
05_recording_behavior_requirements.md
06_reflection_flow_requirements.md
07_settings_requirements.md
```

If behaviour conflicts between implementation and requirement, the requirement file wins.

## Self-Check Loop

After implementing each module:

```text
1. Read that module's requirement file.
2. Check every Completion Criteria item.
3. If any item fails, fix that module before moving on.
4. If the failure affects another module, check both requirement files.
5. Repeat until all Completion Criteria pass.
```

After implementing all modules:

```text
1. Run a complete practice session manually.
2. Select a real save folder.
3. Choose one module.
4. Enter a station title, scenario, and four questions.
5. Start the station.
6. Confirm all timing phases appear in order.
7. Confirm microphone recording starts and stops.
8. Complete reflection.
9. Save session.
10. Inspect the local session folder.
```

## End-To-End Acceptance Criteria

The implementation is acceptable only when:

```text
1. A real local folder is selected.
2. A module can be selected.
3. A station with exactly four questions can be entered.
4. The fixed timer runs through all required phases.
5. The user must answer by microphone.
6. A playable answer.webm is created.
7. Reflection can be written.
8. The local session folder contains question.txt, answer.webm, reflection.md, and metadata.json.
9. The saved text files contain the correct session data.
10. metadata.json is valid JSON.
```

## Failure Handling Loop

If any end-to-end criterion fails:

```text
1. Identify the failed criterion.
2. Map it to the relevant requirement file.
3. Re-read the "What To Implement", "How To Implement", "Completion Criteria", and "If Implementation Fails" sections.
4. Modify the implementation to satisfy that requirement.
5. Re-run the end-to-end check.
6. Continue until the core experience works.
```

## Design Standard

The final tool should feel:

```text
Calm
Clear
Low-distraction
Reliable
Focused on speaking practice
```

Avoid decorative complexity. The interface should make the current step obvious and protect the user's practice record.

