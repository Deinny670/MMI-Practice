# Recording Behaviour Requirements

## What To Implement

Implement mandatory microphone recording for the spoken answer portion of the station.

The app records one continuous audio file:

```text
answer.webm
```

Recording starts at the beginning of Q1 answer and stops at the end of Q4 answer.

## How To Implement

Use:

```text
navigator.mediaDevices.getUserMedia({ audio: true })
MediaRecorder
Blob
```

The app should request microphone permission before the timed station begins, or immediately when the user starts the station.

The UI should show:

```text
Microphone ready
Recording...
Recording complete
```

The app should not record during:

```text
Scenario reading
Question preparation
Reflection
```

It records only the answer phases as one continuous file, with silent gaps not required between answers. If implementation records continuously through prep phases after Q1, metadata should still indicate the answer windows clearly.

## Completion Criteria

Recording is successful when:

```text
1. The browser asks for microphone permission.
2. The station does not proceed without microphone access.
3. Recording starts when Q1 answer starts.
4. Recording stops after Q4 answer ends.
5. answer.webm is saved in the session folder.
6. answer.webm can be played back.
7. The UI makes recording status obvious during answer phases.
```

## If Implementation Fails

If microphone permission is denied:

```text
1. Stop the station before timed practice begins.
2. Explain that microphone access is required.
3. Let the user retry after changing browser permission.
```

If MediaRecorder is unavailable:

```text
1. Show a browser support message.
2. Recommend Chrome or Edge.
3. Do not create a session without audio.
```

If audio saving fails:

```text
1. Keep the recording Blob in memory if possible.
2. Keep the reflection/save screen open.
3. Let the user retry saving.
4. Do not mark the session as saved unless answer.webm is written.
```

