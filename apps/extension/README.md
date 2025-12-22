This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Why Manifest V2?

This extension uses **Manifest V2** with a persistent background page to enable real-time tab delivery via Server-Sent Events (SSE). This is necessary because:

1. **Helium browser** (the target browser) doesn't support Google's FCM/Web Push, so we can't use push notifications
2. **Manifest V3** service workers have a 30-second idle timeout and 5-minute connection limit, making SSE unreliable
3. **MV2's persistent background page** keeps the SSE connection alive indefinitely for instant tab delivery

If you're using Chrome, the built-in "Send to your devices" feature is a better option.

## Getting Started

Run the development server with MV2 target:

```bash
bun dev --target=chrome-mv2
```

Load the extension from `build/chrome-mv2-dev`.

## Production Build

```bash
bun build --target=chrome-mv2
```

This creates a production bundle in `build/chrome-mv2-prod`.
