# General Skill: Writing Version Change Requirement Files

## Purpose

Use this guide whenever creating a new version-change requirement file for this project.

A version-change requirement file defines one bounded product or technical change. It should be clear enough that another AI can implement the change without needing the original conversation.

The file should answer four core questions:

```text
1. What is the problem?
2. How should we approach the problem?
3. What technical details or constraints matter?
4. What result and success criteria should we see?
```

## File Naming

Use a stable versioned filename:

```text
NN_vX.Y.ZZZ_short_change_name_requirements.md
```

Example:

```text
09_v0.1.001_ui_input_change_requirements.md
```

Use:

```text
NN: ordering number in the requirements folder
vX.Y.ZZZ: version/change identifier
short_change_name: lowercase words joined by underscores
```

## Required Structure

Each version-change requirement file should include these sections.

## 1. Purpose

State why this change exists.

Include:

```text
The user-facing problem
The desired improvement
The scope of this specific change
```

Keep this short. The implementation AI needs orientation, not a long product essay.

## 2. Current Behaviour

Describe the current state that needs to change.

Include:

```text
What the UI or system does now
Why it is not ideal
Which existing flows or files are affected
```

If current behaviour is unknown, say what must be inspected before implementation.

## 3. Target Behaviour

Describe what should happen after the change.

Use concrete language:

```text
The screen should show...
The user should be able to...
The saved file should contain...
The error message should say...
```

Avoid vague goals such as "make it better" unless followed by concrete criteria.

## 4. Technical Approach

Give implementation guidance without over-controlling the exact code.

Include:

```text
Relevant files or components
State/data that must be preserved
Parsing, validation, storage, timing, or UI logic involved
Browser APIs or libraries that matter
Compatibility constraints
```

The implementing AI may choose exact code structure, but it must satisfy this section.

## 5. Completion Criteria

List observable checks that prove the change works.

Write criteria as testable statements:

```text
1. The home screen shows nine module titles and no subtitles.
2. Clicking a module opens setup with the selected module preserved.
3. A valid station text block parses into station title, scenario, and four questions.
```

Completion criteria should cover:

```text
UI result
Data flow result
Saved output result, if relevant
Error handling, if relevant
Regression checks for existing flows
```

## 6. Failure Handling

Define what the implementation should do if the change cannot be completed or a runtime error occurs.

Include:

```text
What message the user should see
What data should be preserved
What the implementation AI should re-check
Which requirement file to refer back to
```

Failure handling should protect user work and avoid false success states.

## 7. Implementation Loop

Include a short loop for the implementation AI:

```text
1. Read this file and the relevant base requirement files.
2. Implement the smallest coherent change.
3. Run the specific completion criteria.
4. If a criterion fails, map it back to the relevant section.
5. Fix and re-test until all criteria pass.
6. Report exactly what changed and what was verified.
```

## Writing Standard

A good version-change requirement file is:

```text
Specific
Bounded
Testable
Implementation-aware
Not over-prescriptive
Readable without the original chat
```

Prefer examples when they remove ambiguity.

Avoid:

```text
Long background stories
Unbounded future ideas
Contradictory requirements
Success criteria that cannot be observed
Technical commands that may become stale unless necessary
```

## Mini Template

```markdown
# VX.Y.ZZZ [Short Change Name] Requirements

## Purpose

[Why this change exists and what problem it solves.]

## Current Behaviour

[What happens now.]

## Target Behaviour

[What should happen after the change.]

## Technical Approach

[Implementation guidance, affected files, data flow, APIs, constraints.]

## Completion Criteria

1. [Observable criterion.]
2. [Observable criterion.]
3. [Observable criterion.]

## Failure Handling

[What to do when parsing, saving, UI, permission, or validation fails.]

## Implementation Loop

1. Read this file and related base requirements.
2. Implement the change.
3. Test every completion criterion.
4. Fix failures by returning to the relevant section.
5. Repeat until all criteria pass.
```

