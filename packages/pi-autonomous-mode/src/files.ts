import * as fs from "node:fs";
import * as path from "node:path";

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function writeEpicFile(
  agentDir: string,
  goalId: string,
  index: number,
  title: string,
  acceptanceCriteria: string[],
): string {
  const dir = path.join(agentDir, "autonomous", goalId, "epics");
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `${String(index + 1).padStart(2, "0")}-${slugify(title)}.md`;
  const filePath = path.join(dir, fileName);

  const content = [
    `# ${title}`,
    "",
    "## Acceptance Criteria",
    "",
    ...acceptanceCriteria.map((c) => `- ${c}`),
    "",
  ].join("\n");

  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

export function writeMilestoneFile(
  agentDir: string,
  goalId: string,
  epicIndex: number,
  milestoneIndex: number,
  title: string,
  tasks: string[],
  implNotes: string,
): string {
  const dir = path.join(agentDir, "autonomous", goalId, "milestones");
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `${String(epicIndex + 1).padStart(2, "0")}-${String(milestoneIndex + 1).padStart(2, "0")}-${slugify(title)}.md`;
  const filePath = path.join(dir, fileName);

  const content = [
    `# ${title}`,
    "",
    "## Tasks",
    "",
    ...tasks.map((t) => `- [ ] ${t}`),
    "",
    "## Implementation Notes",
    "",
    implNotes,
    "",
  ].join("\n");

  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

export function updateMilestoneFile(filePath: string, patch: string): void {
  const existing = fs.readFileSync(filePath, "utf8");

  fs.writeFileSync(filePath, existing + "\n" + patch, "utf8");
}

export function deleteFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* file may already be gone */
  }
}
