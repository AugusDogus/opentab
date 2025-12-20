# opentab

Send tabs to your devices.

## Structure

This is a monorepo using [Bun workspaces](https://bun.sh/docs/install/workspaces):

- `apps/extension` — Chrome extension
- `apps/web` — Next.js backend (coming soon)
- `apps/native` — Expo app (coming soon)

## Getting Started

```bash
bun install
```

## Development

```bash
# Run the extension dev server
cd apps/extension
bun dev
```

Then load the `apps/extension/build` folder as an unpacked extension in Chrome.
