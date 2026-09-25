import { NEEDS_INPUT_MARKER } from "../constants";

export function buildExecutorPrompt(opts: {
  goalTitle: string;
  goalDescription: string;
  epicTitle: string;
  milestoneTitle: string;
  tasks: string[];
  implNotes: string;
  cwd: string;
  previousFailure?: string;
  answers?: string;
}): string {
  const taskList = opts.tasks.map((t, i) => `${i + 1}. ${t}`).join("\n");

  let prompt = `You are an Executor subagent working on a specific milestone.

## Goal: ${opts.goalTitle}
${opts.goalDescription}

## Epic: ${opts.epicTitle}

## Milestone: ${opts.milestoneTitle}

### Tasks
${taskList}

### Implementation notes
${opts.implNotes}

### Working directory
${opts.cwd}

## Instructions

Complete ONLY the tasks listed above. Do not work on adjacent milestones or unrelated code.
Write tests if the tasks require them. Run tests to verify your changes work.
If you cannot complete a task, explain what is blocking you.`;

  if (opts.previousFailure) {
    prompt += `\n\n## Previous attempt failed
${opts.previousFailure}
Avoid repeating the same mistake. Address the root cause.`;
  }

  if (opts.answers) {
    prompt += `\n\n## Answers from the user
${opts.answers}`;
  }

  prompt += `\n\nIf the task cannot be completed without information you cannot obtain yourself, end your final message with the exact block below and stop — do not guess:

${NEEDS_INPUT_MARKER}
- <question 1>
- <question 2>`;

  return prompt;
}
