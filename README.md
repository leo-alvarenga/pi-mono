# pi-mono

Monorepo for my personal [pi](https://github.com/earendil-works/pi-coding-agent) packages.
Each package lives in `packages/`, keeps its own version, and is published to npm independently.

## Packages

| Package             | Path                        | Description                                   |
| ------------------- | --------------------------- | --------------------------------------------- |
| `pi-agent-manager`  | `packages/pi-agent-manager` | Agent-mode switching with OpenCode-style permission guards |
| `pi-zen-frame`      | `packages/pi-zen-frame`     | Polished frame/header look for the TUI editor |

## Development

```bash
pnpm install        # install all packages (workspace)
pnpm build          # typecheck everything
```

## Publishing

Each package publishes on its own tag. Bump the version in the package's `package.json`,
commit, then tag and push:

```bash
git tag pi-agent-manager@0.14.1
git push origin --tags
```

The matching GitHub Actions workflow builds and publishes the package to npm.
Requires an npm publish-scope token as the `NPM_TOKEN` repository secret.
