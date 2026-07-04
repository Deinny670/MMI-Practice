# Settings Requirements

## What To Implement

Implement a simple settings area for managing the local save folder.

Settings should support:

```text
Select save folder
Change save folder
Show current save folder name
```

## How To Implement

Use File System Access API folder selection from a user gesture.

When a folder is selected:

```text
1. Store the folder handle if possible.
2. Show the selected folder name.
3. Use it as the destination for future session folders.
```

If a stored folder handle is available on reload:

```text
1. Display the folder name.
2. Verify permission before saving.
3. Ask for permission again if needed.
```

The settings area can appear on the home screen or in a small dedicated settings panel.

## Completion Criteria

Settings are successful when:

```text
1. User can select a folder.
2. User can change the folder.
3. Current folder name is visible.
4. Practice setup knows whether a folder is selected.
5. Saving uses the currently selected folder.
6. Permission loss is detected before save.
```

## If Implementation Fails

If folder handle persistence is unreliable:

```text
1. Require folder selection each time the HTML is opened.
2. Make this clear to the user.
3. Preserve the same save folder flow for the current session.
```

If the selected folder no longer has permission:

```text
1. Ask the user to reselect or reauthorize the folder.
2. Do not continue to save until permission is restored.
```

If the user changes folder mid-session:

```text
1. Use the latest selected folder when Save Session is clicked.
2. Keep current station data unchanged.
```

