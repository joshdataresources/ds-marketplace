# ds-screen-platform — Claude plugin

Prompt→screen design platform as an installable plugin. Bundles the whole machine:

- `commands/new-client.md` — `/ds-screen-platform:new-client acme` bootstraps a client project
  anywhere (plugin commands are namespaced as `/<plugin>:<command>`).
- `skills/screen-builder/` — auto-triggers on "build a … screen"; composes real `<prefix-*>`
  components from the project's generated `ds/manifest.md`, never hand-rolled markup.
- `template/` — the starter machine (tokens-only `ds-*` component library, manifest generator,
  build, lint/verify gates, local server, layouts).
- `scripts/bootstrap-client.mjs` — the CLI the command wraps.

## Install

From a marketplace repo:

```
claude plugin marketplace add <you>/ds-marketplace
claude plugin install ds-screen-platform
```

Or point Claude Code / Cowork at this folder directly for local testing.

## Keep in sync

`template/`, `scripts/`, and `skills/` here are **copies** of the `ds-platform` source
(`../ds-platform/`). Don't edit them here — run `node ../sync.mjs` after any ds-platform
change, before publishing.
