# repo-anatomy.md — Topology, Toolchain and Conventions

Static snapshot of `/home/lasilva/personal/pi-mono` at HEAD (138 commits). Orientation
depth: breadth over API detail. Repo code only; `node_modules` out of scope except where
a resolved version is cited as fact.

**Metrics:** 10 workspace packages (8 `packages/*`, 2 `libs/*`) · ~12,538 TS LOC
(`find packages libs -name '*.ts' | xargs wc -l`) · 14 markdown files outside
`node_modules` · no root tsconfig · no linter.

## 1. Workspace topology

`pnpm-workspace.yaml` is 127 bytes and is entirely:

```yaml
packages:
  - "packages/*"
  - "libs/*"

allowBuilds:
  "@google/genai": true
  esbuild: true
  koffi: true
  protobufjs: true
```

`allowBuilds` is a pnpm 10 install-script allowlist (`pnpm/action-setup@v4`, `version: 10`
in `.github/workflows/publish.yml`); it is the only gate on those four
native/postinstall-bearing transitive deps. One package redundantly restates it:
`packages/pi-zen-frame/package.json` has `"allowScripts": { "@google/genai@1.52.0": true,
"protobufjs@7.6.5": true }`, hard-pinned to exact versions. Two mechanisms, one intent.

Root `package.json` (`@leo-alvarenga/pi-mono`, `private: true`) holds only orchestration,
no dependencies but prettier:

| script | command | note |
| --- | --- | --- |
| `build` | `pnpm -r build` | per-package semantics differ (§7) |
| `typecheck` | `pnpm -r typecheck` | recursive |
| `test` | `pnpm -r test` | **errors** on `pi-autonomous-mode` (no `test` script) |
| `format` / `format:check` | `prettier --write .` / `--check .` | root-only tool |
| `sync-versions` | `bash ci/sync-versions.sh` | only local CI helper (`ci/sync-versions.sh`) |

Root devDependencies: `prettier ^3.9.6` only. `node -e` against
`node_modules/{typescript,vitest,@types/node,typebox}` reports "NOT AT ROOT" for all four —
every tool is installed per-package. All 10 packages are `@leo-alvarenga/*`; upstream host
packages are `@earendil-works/*` and are always `peerDependencies: "*"`, never
`dependencies`.

`packages/pi-autonomous-mode/package.json` is the only package peering on a **sibling
workspace package** — `"@leo-alvarenga/pi-mini-subagents": "*"`. It also peers on `typebox`
without declaring it in `devDependencies` (resolves 1.3.7 transitively).

## 2. The two workspace roots: `packages/` vs `libs/`

**`packages/*` are pi extensions.** Each declares a non-empty `pi.extensions` array
pointing at its own entry module and peers on the host
`@earendil-works/pi-coding-agent`. They export no library API of their own; they exist to
be discovered by the host.

**`libs/*` are plain libraries.** `libs/pi-ext-core` and `libs/pi-sqlite` have **no `pi`
field at all** — they are not loadable as extensions. They use the workspace protocol
(`"@leo-alvarenga/pi-ext-core": "workspace:*"`). `pi-ext-core` is consumed by 6 of the 8
extension packages (`pi-agent-manager`, `pi-autonomous-mode`, `pi-mini-subagents`,
`pi-notify`, `pi-todo-list`, `pi-zen-frame`); `pi-sqlite` has exactly one consumer,
`pi-autonomous-mode`. `pi-hash-edit` and `pi-status-broadcaster` depend on neither. Unlike
the extension packages, the libs declare a public API surface:

```json
"exports": { ".": { "types": "./src/index.ts", "import": "./src/index.ts",
                    "require": "./src/index.ts", "default": "./src/index.ts" } },
"types": "./src/index.ts"
```

All four conditions resolve to the same **raw `.ts`** file. `require` pointing at an
ESM-with-type-annotations `.ts` is nominal, not a working CJS entry: nothing here is
consumable by plain `node` or a bundler without a TS loader. `libs/pi-sqlite` also sets
`"engines": { "node": ">=22.5" }` — the only `engines` field in the workspace (it uses
`node:sqlite`). `README.md` says libs are consumed as `workspace:^`; the manifests say
`workspace:*`. The README is wrong on the range operator.

## 3. Extension loading model

Entry points use a **non-standard `pi` field** in `package.json`. No package uses `main`,
`module`, or `bin` for discovery.

```json
"pi": { "extensions": ["./src/index.ts"], "skills": ["./skills"] }
```

| package | `pi.extensions` | entry LOC | `pi.skills` |
| --- | --- | --- | --- |
| `pi-agent-manager` | `./src/index.ts` | 14 | — |
| `pi-autonomous-mode` | `./src/index.ts` | 82 | — |
| `pi-hash-edit` | `./src/hash-edit-tools.ts` | 6 | `./skills` ✅ exists |
| `pi-mini-subagents` | `./src/index.ts` | 12 | `./skills` ❌ **missing** |
| `pi-notify` | `./src/index.ts` | 95 | — |
| `pi-status-broadcaster` | `./extensions/index.ts` | 160 | — |
| `pi-todo-list` | `./src/index.ts` | 46 | — |
| `pi-zen-frame` | `./extensions/index.ts` | 260 | — |
| `pi-ext-core` (lib) | no `pi` field | — | — |
| `pi-sqlite` (lib) | no `pi` field | — | — |

1. **Entry points are raw TypeScript** — every path ends in `.ts`, and there is no build
   step producing JS the host could load instead. The host must supply a TS loader.
   `pi-hash-edit` has no `src/index.ts`; its entry is a 6-line default-export wrapper
   around `registerHashTools` (imports `"./tools"`, bare specifier).
2. **The `pi` field is invisible to npm, pnpm, and node.** Nothing validates it.
   `packages/pi-mini-subagents/package.json` declares `"skills": ["./skills"]` and lists
   `"skills"` in `files`, but **no `skills/` directory exists in that package** — only
   `packages/pi-hash-edit/skills/hash-edit/SKILL.md` exists anywhere in the workspace. A
   declared capability with no artifact and no tooling that would ever fail. **HIGH.**
3. **`files` mirrors the layout and drifts.** Extension packages publish source
   (`["src", "!src/test", …]` or `["extensions", "!extensions/test", …]`). Two
   discrepancies: `packages/pi-autonomous-mode/package.json` lists `"LICENSE"` in `files`
   but **the package has no LICENSE file** (all 9 others do); and both `pi-hash-edit` and
   `pi-mini-subagents` list `"skills"` regardless of whether it exists.
4. `packages/pi-autonomous-mode/` is also the only package whose markdown lives somewhere
   other than `docs/` or the root: it uses `goals/` (plan files). `pi-agent-manager` and
   `pi-zen-frame` have `docs/`; the rest have none.

## 4. Layout conventions

| layout | packages |
| --- | --- |
| `src/` | `pi-agent-manager`, `pi-autonomous-mode`, `pi-hash-edit`, `pi-mini-subagents`, `pi-notify`, `pi-todo-list`, `pi-ext-core`, `pi-sqlite` |
| `extensions/` | `pi-status-broadcaster`, `pi-zen-frame` |

No package has both. `packages/pi-todo-list` uses `src/` (`ls packages/pi-todo-list` →
`src/`), not `extensions/`. The choice is not cosmetic: the two `extensions/` packages are
exactly the two whose tsconfig emits declarations and whose `build` is bare `tsc`.

**`dist/` exists on disk for exactly those two packages** (`for d in packages/* libs/*; do
[ -d "$d/dist" ] && echo "$d"; done`). `.gitignore` contains `**/dist/`, so this output is
**not in the repository** — it is a stale local build artifact. Both also gitignore it
locally (`packages/pi-status-broadcaster/.gitignore`: `node_modules/` + `dist/`;
`packages/pi-zen-frame/.gitignore`: `node_modules/` + `dist/` + `.pi/` + `.zen-check/`).
`packages/pi-zen-frame/dist/types/test/` exists because `extensions/test` sits inside
`rootDir: "extensions"`.

Shapes: `pi-autonomous-mode` has `commands/`, `db/`, `tool/` plus flat `index.ts`,
`constants.ts`, `files.ts`, `store.ts`, `supervisor.ts`, `types.ts`, `widget.ts`;
`pi-zen-frame` has `components/ config/ editor/ headers/ renderers/ utils/ test/`;
`pi-ext-core` has `headless/ session/ subagents/ tui/ utils/ test/`; small packages are
flat files only (`pi-mini-subagents`: `config.ts`, `constants.ts`, `index.ts`, `test/`).

## 5. Toolchain

Resolved versions read from each package's own installed `node_modules`, not declared
ranges:

| tool | resolved | declared | distribution |
| --- | --- | --- | --- |
| `typescript` | **7.0.2** | `^7.0.2` | all 10 |
| `vitest` | **3.2.7** | `^3.2.4` | 9 of 10 |
| `@types/node` | **22.20.1** / **26.2.0** | `^22`, `^22.0.0`, `^26.1.2` | 7 × 22.20.1, 3 × 26.2.0 |
| `typebox` | **1.3.7** | `"*"` (peer) | 8 transitively |
| `prettier` | **3.9.6** | `^3.9.6` | root only |
| node (CI) | 22 | — | `.github/workflows/publish.yml` |

- **TypeScript is uniform at 7.0.2** across all 10 packages.
- **`@types/node` is the widest split:** 22.20.1 in `pi-agent-manager`,
  `pi-autonomous-mode`, `pi-mini-subagents`, `pi-notify`, `pi-todo-list`, `pi-ext-core`,
  `pi-sqlite`; 26.2.0 in `pi-hash-edit`, `pi-status-broadcaster`, `pi-zen-frame`.
- **`typebox` is peer-only everywhere** (declared `"*"`, no devDependency backup).
- **CI does not match the toolchain.** `.github/workflows/publish.yml` installs Node 22,
  runs `pnpm --filter <pkg> typecheck`, then `pnpm --filter <pkg> run --if-present test`
  (the `--if-present` is what keeps `pi-autonomous-mode` from failing the pipeline), then
  `build`. Nothing in CI checks formatting, so `format:check` is a local-only obligation.

## 6. tsconfig profiles and drift

**There is no root `tsconfig.json` and no shared base.** Ten hand-maintained configs exist,
one per package, in two profiles. Sizes: 240 B (×4), 246 B (×3), 280 B, 338 B (×2) — the
240- and 246-byte groups are byte-identical within themselves.

**Profile A — `src` layout, typecheck-only (8 packages:** `pi-agent-manager`,
`pi-autonomous-mode`, `pi-hash-edit`, `pi-mini-subagents`, `pi-notify`, `pi-todo-list`,
`pi-ext-core`, `pi-sqlite`**)** — verbatim from `packages/pi-autonomous-mode/tsconfig.json`:

```json
{ "compilerOptions": { "target": "ES2023", "module": "ESNext",
    "moduleResolution": "bundler", "strict": true, "skipLibCheck": true,
    "noEmit": true, "types": [], "rootDir": "src" }, "include": ["src"] }
```

**Profile B — `extensions` layout, emits declarations (2 packages:**
`pi-status-broadcaster`, `pi-zen-frame`**)** — verbatim from
`packages/pi-zen-frame/tsconfig.json` (same key set, different key order than
`pi-status-broadcaster`'s):

```json
{ "compilerOptions": { "types": [], "strict": true, "target": "ES2022",
    "module": "ESNext", "composite": true, "declaration": true, "skipLibCheck": true,
    "outDir": "dist/types", "rootDir": "extensions", "declarationMap": true,
    "moduleResolution": "bundler" }, "include": ["extensions"] }
```

**Drift inside Profile A — why a shared base matters.** The 8 files are *almost* identical
and every difference is load-bearing and undocumented:

| drift | where | impact |
| --- | --- | --- |
| `"allowImportingTsExtensions": true` | **only** `pi-hash-edit` | currently dead — no import specifier anywhere in the workspace ends in `.ts`. A per-package escape hatch the other 7 Profile-A packages lack, so the same source would not compile everywhere |
| `"types": ["node"]` | `pi-notify`, `pi-ext-core`, `pi-sqlite` — **3, not 1** | the other 5 Profile-A configs set `"types": []`, which suppresses all auto-included `@types/*`. `pi-notify` is the only one of the three inside `packages/`. Net effect: `@types/node` is installed in 7 packages but type-visible in only 3 |
| `"target": "ES2022"` | all of Profile B | the 2 `extensions/` packages compile to an older language/runtime surface than the other 8 (`ES2023`) |
| config size / key order | per package | confirms hand-maintenance rather than generation |

No `references` array exists anywhere, so `composite: true` buys declaration emit and an
incremental build, **not** project references. There is no cross-package TS project graph:
each package typechecks against its workspace deps' published `./src/index.ts` entry with
`skipLibCheck` on.

## 7. Conventions

**ESM everywhere.** `"module": "ESNext"` + `"moduleResolution": "bundler"` in all 10
configs. No `"type": "module"` in any `package.json`, including root — the repo is
package-type-agnostic: raw `.ts` loaded by a host, never executed as a node package.

**Strict in all 10.** `"strict": true` and `"skipLibCheck": true` in every config, no
exceptions: first-party code strictly checked, third-party `.d.ts` errors suppressed.

**Formatting:** prettier at root only. `.prettierrc.json` (256 B) sets `printWidth: 80`,
`tabWidth: 2`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`, `arrowParens:
"always"`, `endOfLine: "lf"`. `.prettierignore` excludes `node_modules`, `dist`, `.pi`,
`pnpm-lock.yaml`. No package overrides it; no `.editorconfig`.

**No linter of any kind.** No ESLint/Biome/oxlint config or script, root or per-package,
and no lint CI step. Prettier plus `strict` is the entire static-analysis surface.

**Tests:** vitest, colocated in a `test/` directory *inside* the compiled root —
`src/test/` for the 8 `src`-layout packages, `extensions/test/` for the 2 `extensions`-layout
packages. All 28 test files are `*.test.ts` importing `../<module>`. No vitest config file
anywhere; tests run on vitest defaults via `"test": "vitest run"`. This pairs with
`"files": ["src", "!src/test"]` — tests live inside the published root and must be
explicitly excluded from the tarball.

**Coverage gap (HIGH):** `packages/pi-autonomous-mode` has **no `test` script and no
`vitest` devDependency**. At 2,183 LOC it is the largest package in the workspace and has
**zero tests**. The other 9 all have both. Root `pnpm test` therefore errors on it, and
`publish.yml` masks it with `--if-present`.

**`build` is not a build in 8 of 10 packages.**

| packages | `build` | `typecheck` | emits |
| --- | --- | --- | --- |
| the 8 `src`-layout packages | `tsc --noEmit` | `tsc --noEmit` | nothing |
| `pi-status-broadcaster`, `pi-zen-frame` | `tsc` | `tsc` | `dist/types/**` + declaration maps |

In all 10 packages `build` and `typecheck` are the same command with the same flags — two
names for one operation. In Profile B it genuinely emits, but since `dist/` is gitignored,
`files` lists `extensions`, and there is no `prepare`/`prepublishOnly` hook, the output is
never published. The emit produces a stale local artifact with no consumer.

**Versions are independent and unbounded:** 0.2.8 (`pi-hash-edit`), 0.2.11 (`pi-notify`),
0.3.0 (`pi-sqlite`), 0.3.5 (`pi-status-broadcaster`), 0.4.2 (`pi-mini-subagents`), 0.6.0
(`pi-autonomous-mode`), 0.6.1 (`pi-ext-core`), 0.8.1 (`pi-todo-list`), 0.18.15
(`pi-agent-manager`), 0.22.0 (`pi-zen-frame`). The root `sync-versions` script implies a
lockstep policy the manifests do not reflect. `publish.yml` detects changed
`**/package.json` paths, skips versions already on npm, typechecks/tests/builds the
filtered package, tags `<name>@<version>`, publishes, and cuts a GitHub release.

## 8. What is NOT here

- **No root `tsconfig.json`** — 10 duplicated configs, 4 drift points (§6), no `references`.
- **No lint configuration** of any kind (§7).
- **No pnpm catalog.** `pnpm-workspace.yaml` has only `packages` and `allowBuilds`; every
  version is repeated per package, which is how `@types/node` split into 22.20.1/26.2.0.
- **No `.pi/` hooks or config.** `.pi/` exists at the root but holds a single **empty**
  `tasks/` directory (`.pi/tasks`), gitignored via `.pi/` in `.gitignore`. No
  `settings.json`, no hook scripts, no `.pi/extensions`, no `.pi/skills`.
  `packages/pi-zen-frame/.gitignore` also lists `.pi/`, gitignoring a directory it does not
  contain. No package has its own config directory; per-package config is either
  `src/constants.ts` or the `pi` field.
- **No CI beyond publish.** `.github/workflows/` holds exactly one file, `publish.yml`: no
  `ci.yml`, no PR test workflow, no format check, no whole-workspace matrix. The only
  automated checks ride the publish path, per-published-package, with `--if-present` on tests.
- **No build output in the repository** (§4) — `dist/` is gitignored everywhere.
- **No LICENSE in `pi-autonomous-mode`**, despite `files` claiming one.
- **No skill directory in `pi-mini-subagents`**, despite `pi.skills` and `files` claiming one.
- **No `engines` on 9 of 10 packages**, no `.nvmrc`, no `.node-version`; Node 22 is pinned
  only inside `publish.yml`.
- **No `type: "module"`**, no `.editorconfig`, no `CONTRIBUTING`/`CODE_OF_CONDUCT`, no
  `CHANGELOG`.
- **Documentation asymmetry (HIGH):** all 10 packages have a `README.md`, but the **root
  `README.md` omits `pi-autonomous-mode` entirely** — `grep -c autonomous README.md`
  returns `0`. The root Packages table lists 7 entries; the workspace has 8 packages. The
  largest package (~17% of the workspace) is invisible from the front door, and its own
  README is the thinnest at 23 lines / ~1.2 KB, versus 8.6 KB for `pi-agent-manager`.
