# Hello, Autonomous World

A simple showcase goal to demonstrate the autonomous mode pipeline end-to-end.
All tasks are non-destructive and write to a temporary output directory.

## Context

This goal exists purely to exercise the Researcher → Planner → Executor flow.
There is no real business value. The output directory can be deleted at any time.

## Output location

All files must be written to:
```
packages/pi-autonomous-mode/goals/output/hello/
```

Create the directory if it does not exist.

## Acceptance criteria

- [ ] `facts.md` exists in the output directory with at least 3 categories of useless trivia, each containing at least 2 facts.
- [ ] `glossary.md` exists in the output directory with a short glossary of 5 made-up (but plausible-sounding) technical terms.
- [ ] `summary.md` exists in the output directory and references both other files.
- [ ] No real code is touched. No dependencies are installed.

## Constraints

- Plain markdown only; no scripts, no compiled output.
- Keep every file under 50 lines.
- The goal is complete the moment all three files are present and non-empty.
