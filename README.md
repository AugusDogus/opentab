# opentab

Send tabs to your devices.

## Structure

This is a monorepo using [Bun workspaces](https://bun.sh/docs/install/workspaces) and [Turborepo](https://turbo.build/repo):

- `apps/extension` — Chrome extension
- `apps/web` — Next.js backend (coming soon)
- `apps/native` — Expo app (coming soon)

## Getting Started

```bash
bun install
```

## Development

```bash
# Run all dev servers
bun run dev

# Run a specific app
turbo run dev --filter=@opentab/extension
```

For the Chrome extension, load `apps/extension/build` as an unpacked extension.

## Build

```bash
bun run build
```
