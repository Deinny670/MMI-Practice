# Practice Setup Requirements

## What To Implement

Implement a setup screen for one full station.

The user manually enters:

```text
Station title
Scenario / context
Question 1
Question 2
Question 3
Question 4
```

All four question fields are required.

## How To Implement

After the user selects a module from the home screen, show:

```text
Selected module
Station title input
Scenario / context textarea
Question 1 textarea
Question 2 textarea
Question 3 textarea
Question 4 textarea
Start Station button
```

The `Start Station` button should be disabled until:

```text
1. A save folder has been selected.
2. All four question fields have content.
3. Microphone support exists in the browser.
```

The scenario field can be optional, but if entered, it must be saved and shown during the scenario reading phase.

## Completion Criteria

Practice setup is successful when:

```text
1. The selected module is visible.
2. The user can enter station title, scenario, and four questions.
3. All four questions are required.
4. Start Station only becomes available when required inputs are present.
5. The entered station data is shown correctly during timed practice.
6. The entered station data is written correctly to question.txt and metadata.json.
```

## If Implementation Fails

If required fields are missing:

```text
1. Do not start the station.
2. Highlight or describe what is missing.
3. Keep all entered data intact.
```

If the user has not chosen a save folder:

```text
1. Prompt them to choose one.
2. Return them to setup after folder selection.
3. Keep all entered station data intact.
```

If microphone APIs are unavailable:

```text
1. Show a clear message that microphone recording is required.
2. Do not start a non-recorded station.
```

