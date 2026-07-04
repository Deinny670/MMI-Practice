# Storage Model Requirements

## What To Implement

Implement real local folder saving for each completed practice session.

The user selects a save folder. Each completed station creates a new child session folder containing:

```text
question.txt
answer.webm
reflection.md
metadata.json
```

The preferred browser runtime is Chrome or Edge.

## How To Implement

Use the browser File System Access API:

```text
window.showDirectoryPicker()
FileSystemDirectoryHandle.getDirectoryHandle()
FileSystemFileHandle.createWritable()
```

The app should:

```text
1. Ask the user to select a save folder from a user gesture.
2. Store the selected directory handle if possible.
3. Before saving, verify the app still has read/write permission.
4. Create a unique session folder.
5. Write all required session files.
6. Confirm successful save in the UI.
```

The session folder name should be readable and filesystem-safe:

```text
YYYY-MM-DD_HH-mm_module-slug
```

If a station title exists, append a short sanitized title slug:

```text
2026-08-12_19-30_ethics-decision-making_friend-stealing
```

Use lowercase slugs, replace spaces with hyphens, and remove characters unsafe for filenames.

## Required File Contents

### question.txt

Include:

```text
Module
Station Title
Scenario
Question 1
Question 2
Question 3
Question 4
```

### answer.webm

Save the full station audio recording as one file.

### reflection.md

Save the user's written reflection in Markdown.

### metadata.json

Include at least:

```json
{
  "sessionId": "2026-08-12_19-30_ethics-decision-making",
  "createdAt": "2026-08-12T19:30:00+10:00",
  "module": "Ethics / Decision-Making",
  "stationTitle": "Friend stealing at work",
  "timing": {
    "scenarioReadSeconds": 30,
    "questionPrepSeconds": 15,
    "answerSeconds": 60,
    "questionCount": 4
  },
  "files": {
    "question": "question.txt",
    "audio": "answer.webm",
    "reflection": "reflection.md"
  },
  "audioSegments": {
    "q1": { "startSeconds": 0, "endSeconds": 60 },
    "q2": { "startSeconds": 75, "endSeconds": 135 },
    "q3": { "startSeconds": 150, "endSeconds": 210 },
    "q4": { "startSeconds": 225, "endSeconds": 285 }
  }
}
```

## Completion Criteria

Storage is successful when:

```text
1. The user can choose a folder.
2. A completed station creates a new session folder.
3. The folder contains question.txt, answer.webm, reflection.md, and metadata.json.
4. question.txt contains the exact module, scenario, and four questions.
5. answer.webm is playable.
6. reflection.md contains the user's reflection.
7. metadata.json is valid JSON and references the saved files.
8. The user sees a clear success message after saving.
```

## If Implementation Fails

If File System Access API is unavailable:

```text
1. Show a clear message that Chrome or Edge is required.
2. Do not silently pretend saving worked.
3. Do not replace this with browser-only hidden storage for Wave 1.
```

If permission is denied:

```text
1. Explain that a save folder is required.
2. Let the user retry folder selection.
3. Preserve current station data in memory so the user does not immediately lose work.
```

If saving one file fails:

```text
1. Report which file failed.
2. Keep the reflection screen open.
3. Let the user retry save.
4. Do not show a success message until all four files are written.
```

