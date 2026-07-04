# Home Screen Requirements

## What To Implement

Implement a home screen that presents the Melbourne MMI practice tool and the nine ability modules.

The home screen should make the next action obvious:

```text
Choose a module to start a station.
```

## How To Implement

Display the nine modules as clear clickable controls:

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

Each module should include a short description:

```text
Motivation / Course Fit: clarify why medicine, why this course, and readiness for the path.
Communication / Rapport: practise clear, empathetic communication.
Professional Behaviour: practise boundaries, respect, integrity, and responsibility.
Ethics / Decision-Making: practise balanced reasoning in difficult situations.
Teamwork / Collaboration: practise working with peers, conflict, and shared responsibility.
Reflection / Feedback: practise self-awareness, feedback, failure, and growth.
Public Health / Social Awareness: practise population-level thinking and health equity.
De-technicalisation: practise explaining complex ideas simply.
Cultural Safety / Equity: practise respectful care across cultures and unequal systems.
```

The home screen should also show save folder status:

```text
Save folder selected: [folder name]
```

or:

```text
No save folder selected
```

## Completion Criteria

The home screen is successful when:

```text
1. All nine modules are visible.
2. Each module is clickable.
3. Clicking a module opens practice setup for that module.
4. The selected module name is preserved into setup, metadata, question.txt, and reflection flow.
5. The save folder status is visible.
6. The layout works on a laptop screen without crowding or overlapping text.
```

## If Implementation Fails

If module selection does not preserve the selected module:

```text
1. Fix state flow before implementing later screens.
2. Confirm the chosen module appears on the setup screen.
3. Confirm the same module appears in saved files.
```

If the UI feels crowded:

```text
1. Reduce visual decoration.
2. Prefer a simple responsive grid.
3. Keep module cards/buttons readable and scannable.
```

