# Reflection Flow Requirements

## What To Implement

After Q4 answer ends, show a reflection screen.

The user writes answers to four fixed reflection prompts:

```text
1. What was the core issue or conflict in this station?
2. What did I do well in my answer?
3. What would I change if I answered again?
4. Did I show structure, empathy, professionalism, and a clear next step?
```

The reflection is saved as:

```text
reflection.md
```

## How To Implement

Show one textarea per prompt.

The reflection screen should also show a short station summary:

```text
Module
Station title
Completion time
```

The user should have a clear final action:

```text
Save Session
```

When `Save Session` is clicked, the app writes all required session files into the selected local folder.

## Completion Criteria

Reflection flow is successful when:

```text
1. Reflection appears immediately after station completion.
2. All four reflection prompts are visible.
3. The user can write a response for each prompt.
4. Save Session writes reflection.md.
5. reflection.md uses readable Markdown headings.
6. The app confirms when the full session has been saved.
```

## If Implementation Fails

If the user leaves a reflection field blank:

```text
1. Allow saving.
2. Preserve the blank heading in reflection.md.
3. Do not block the user, because reflection quality is user-controlled.
```

If saving fails:

```text
1. Keep all reflection text visible.
2. Show a clear save error.
3. Let the user retry save.
```

If the reflection screen appears before recording is complete:

```text
1. Fix station phase transitions.
2. Do not allow save until recording has stopped and the audio Blob exists.
```

