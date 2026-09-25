# Pi Mono Codebase Archaeology

Generate a comprehensive archaeology report of this repository.
The report must be thorough enough for onboarding and cover all relevant aspects.

## Background

A new team member is joining next week. They need to understand the repo quickly.
The archaeology report should give them everything they need.

## Desired output

A set of markdown reports written to:
```
packages/pi-autonomous-mode/goals/output/archaeology/
```

The exact file names and internal structure are up to you.

## What "comprehensive" means

Figure it out. Use your judgment. Cover whatever you think matters.

## Constraints

- Read-only operations only. Do not modify any source file.
- Do not install packages or run build commands.
- If a package has no `README.md`, note it but do not create one.
- Output files live only under `goals/output/archaeology/`; nowhere else.

## Potential pitfalls to watch for

- Some packages may lack a `src/` directory — handle gracefully.
- `node_modules/` directories must be excluded from all analysis.
- The repo uses `pnpm` workspaces; reflect that in the dependency map.
- There may be packages that share a dependency but declare different versions — flag those.

## Definition of done

The goal is complete when:
1. At least one top-level index report exists summarising all packages found.
2. Each package discovered has its own section or file in the output.
3. Any cross-cutting finding (shared deps, version mismatches, missing docs) is called out explicitly.

There is no fixed number of epics or milestones. Scope as you see fit after exploring the repo.
