# Melbourne MMI Practice Tool - Wave 1 High-Level Design v0.2

## Purpose

This document gives the implementation AI the product context for Wave 1.

The tool is a local HTML-based practice aid for University of Melbourne MD MMI preparation. Wave 1 should behave like a focused Melbourne-style station recorder:

```text
Select ability module
Enter station scenario and four questions
Run a fixed timed station
Record spoken answers by microphone
Complete written reflection
Save all session files into a real local folder
```

The tool is designed for spoken practice. The candidate should answer by voice, not by typing an answer.

## Core Experience

The user should be able to:

```text
Open the HTML
Choose a save folder
Choose one of nine modules
Paste a scenario and four questions
Start a station
Speak through the timed prompts
Write a short reflection
Save a complete session folder locally
```

The saved local files should be easy to inspect and easy to send to an AI or human reviewer later.

## Ability Modules

The home screen presents nine ability modules:

```text
1. Motivation / Course Fit
2. Communication / Rapport
3. Professional Behaviour
4. Ethics / Decision-Making
5. Teamwork / Collaboration
6. Reflection / Feedback
7. Public Health / Social Awareness
8. De-technicalisation
9. Cultural Safety / Equity
```

These modules are practice categories. They are not a claim that Melbourne uses exactly these nine fixed station themes.

## Station Structure

Each station contains:

```text
Station title
Scenario / context
Question 1
Question 2
Question 3
Question 4
```

All Wave 1 stations have exactly four questions.

## Timing Model

Each station uses this fixed timing model:

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
```

Total station time:

```text
30s + 4 * 75s = 5 minutes 30 seconds
```

## Local Session Output

Each completed station should create one session folder inside the user-selected save folder.

Example:

```text
Melbourne MMI Practice/
  2026-08-12_19-30_ethics-decision-making/
    question.txt
    answer.webm
    reflection.md
    metadata.json
```

## Design Direction

The interface should be calm, clear, and low-distraction. It should feel like a serious practice tool, not a landing page.

Prioritize:

```text
Clear station flow
Readable question text
Obvious timer state
Obvious recording state
Reliable local saving
Simple recovery messages when something fails
```

