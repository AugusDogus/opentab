<div align="center">
    <br/>
    <p>
        <img src="apps/extension/assets/icon.png"
            title="Helium" alt="opentab logo" width="120" />
        <h1>opentab</h1>
    </p>
    <p width="120">
        Send tabs to your devices instantly.
    </p>
    <video width="1460" height="1016" title="opentab" src="https://github.com/user-attachments/assets/60071e12-d41b-4a6e-8a07-7e61c8cceec4"></video>
</div>

## Tech Stack

- [Expo](https://expo.dev/) - React Native framework with SDK 54
- [Plasmo](https://docs.plasmo.com/) - Browser extension framework
- [Next.js](https://nextjs.org/) - React framework for the landing page and API routes
- [tRPC](https://trpc.io/) v11 - Type-safe API layer
- [Better Auth](https://www.better-auth.com/) - Authentication
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [Turso](https://turso.tech/) - Serverless SQLite database (libSQL)
- [Turborepo](https://turbo.build/) - Monorepo tooling
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) & [NativeWind](https://www.nativewind.dev/) - Styling

## Project Structure

The monorepo is organized using [Turborepo](https://turborepo.com) and contains:

```bash
opentab/
├── apps/
│   ├── extension/     # Chrome extension
│   │   ├─ Plasmo framework
│   │   ├─ React 19
│   │   ├─ Tailwind CSS
│   │   └─ Typesafe API calls using tRPC
│   ├── native/        # React Native mobile app
│   │   ├─ Expo SDK 54
│   │   ├─ React Native using React 19
│   │   ├─ Navigation using Expo Router
│   │   ├─ Tailwind using NativeWind
│   │   └─ Typesafe API calls using tRPC
│   └── server/        # Next.js app
│       ├─ Landing page with marketing content
│       ├─ API routes (tRPC, auth, realtime)
│       └─ E2E Typesafe API Server & Client
├── packages/
│   ├── api/           # tRPC v11 router definition
│   ├── auth/          # Better Auth configuration
│   ├── config/        # Shared TypeScript configuration
│   └── db/            # Drizzle ORM with Turso (libSQL)
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- [Turso](https://turso.tech/) account and database created
- iOS/Android device or simulator/emulator (for native app)

### 1. Clone and Install

```bash
git clone https://github.com/AugusDogus/opentab
cd opentab
bun install
```

### 2. Configure Environment Variables

Copy the example env files and fill in your values for each app.

### 3. Push Database Schema

```bash
bun db:push
```

### 4. Start Development

```bash
# Start all apps
bun dev

# Or start specific apps
bun dev:extension      # Chrome extension
bun dev:native         # Expo app
bun dev:server         # API server
```

### 5. Load the Extension

For the Chrome extension, load `apps/extension/build/chrome-mv2-dev` as an unpacked extension.

> **Note:** This extension uses Manifest V2 with SSE for real-time tab delivery, targeting Helium browser. See [why MV2](#why-manifest-v2) below.

## Available Scripts

```bash
# Development
bun dev                # Start all apps in parallel
bun dev:extension      # Start Chrome extension
bun dev:native         # Start Expo app
bun dev:server         # Start API server

# Database
bun db:push            # Push schema changes to Turso
bun db:generate        # Generate migrations
bun db:migrate         # Run migrations
bun db:studio          # Open Drizzle Studio

# Linting & Formatting
bun lint               # Run oxlint and oxfmt
bun typecheck          # Run TypeScript checks

# Building
bun build              # Build all packages
```

## Why Manifest V2?

The browser extension uses **Manifest V2** with a persistent background page to enable real-time tab delivery via Server-Sent Events (SSE). This is necessary because:

1. **Helium browser** (the target browser) doesn't support Google's FCM/Web Push
2. **Manifest V3** service workers have a 30-second idle timeout and 5-minute connection limit, making SSE unreliable
3. **MV2's persistent background page** keeps the SSE connection alive indefinitely

If you're using Chrome, the built-in "Send to your devices" feature is a better option.
