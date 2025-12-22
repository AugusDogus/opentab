## 🚀 Features

- Add react support for building popup and options page - by Luqman Olushi [(f2d02)](https://github.com/AugusDogus/opentab/commit/f2d025d)
- Add tailwindcss support - by Luqman Olushi [(820ff)](https://github.com/AugusDogus/opentab/commit/820ff93)
- Add a websocket server that notifies file changes to clients - by Luqman Olushi [(32ffa)](https://github.com/AugusDogus/opentab/commit/32ffa60)
- Upgrade bun lockfile - by @AugusDogus [(4a425)](https://github.com/AugusDogus/opentab/commit/4a425dd)
- Add context menu and theme-aware extension icons - by @AugusDogus [(53a85)](https://github.com/AugusDogus/opentab/commit/53a8514)
- Add native app, server, and restructure monorepo - by @AugusDogus [(a1e68)](https://github.com/AugusDogus/opentab/commit/a1e68d3)
- Add Web Push for instant tab delivery to extensions - by @AugusDogus [(3a041)](https://github.com/AugusDogus/opentab/commit/3a04178)
- **api:**
  - Add device router for device management - by @AugusDogus & @cursoragent [(cb1ce)](https://github.com/AugusDogus/opentab/commit/cb1cec2)
  - Add tab router for sending tabs between devices - by @AugusDogus & @cursoragent [(e156b)](https://github.com/AugusDogus/opentab/commit/e156b87)
- **db:**
  - Add device schema for push notification tokens - by @AugusDogus & @cursoragent [(387ae)](https://github.com/AugusDogus/opentab/commit/387aede)
- **devices:**
  - Add device management UI with HeroUI integration - by @AugusDogus [(1781e)](https://github.com/AugusDogus/opentab/commit/1781e2e)
- **extension:**
  - Add tab sending and receiving functionality - by @AugusDogus & @cursoragent [(6c9b4)](https://github.com/AugusDogus/opentab/commit/6c9b4fc)
  - Update popup UI with send tab button and device list - by @AugusDogus & @cursoragent [(0ccbb)](https://github.com/AugusDogus/opentab/commit/0ccbb18)
  - Switch to Manifest V2 with SSE for real-time tab delivery - by @AugusDogus [(c5c3e)](https://github.com/AugusDogus/opentab/commit/c5c3efd)
- **native:**
  - Add device registration and push notification handling - by @AugusDogus & @cursoragent [(67c58)](https://github.com/AugusDogus/opentab/commit/67c5894)
  - Improve UI polish and loading states - by @AugusDogus [(6ed35)](https://github.com/AugusDogus/opentab/commit/6ed35e9)
  - Add expo-share-intent for sharing links to the app - by @AugusDogus [(b9bb0)](https://github.com/AugusDogus/opentab/commit/b9bb095)

## 🐞 Bug Fixes

- Update context menu title for better clarity - by @AugusDogus [(4bd90)](https://github.com/AugusDogus/opentab/commit/4bd9058)
- Address CodeRabbit review feedback - by @AugusDogus [(9236f)](https://github.com/AugusDogus/opentab/commit/9236f54)
- Address additional CodeRabbit review feedback - by @AugusDogus [(c403c)](https://github.com/AugusDogus/opentab/commit/c403c24)
- Address remaining CodeRabbit review comments - by @AugusDogus [(e5851)](https://github.com/AugusDogus/opentab/commit/e585185)
- **ci:**
  - Correct yaml indentation in native-build workflow - by @AugusDogus [(c097a)](https://github.com/AugusDogus/opentab/commit/c097a41)
  - Fix release asset upload race condition - by @AugusDogus [(e3b98)](https://github.com/AugusDogus/opentab/commit/e3b9842)
- **device:**
  - Prevent duplicate device registrations - by @AugusDogus [(18625)](https://github.com/AugusDogus/opentab/commit/186251b)
- **native:**
  - Wrap light theme variables in @variant light block - by @AugusDogus [(36469)](https://github.com/AugusDogus/opentab/commit/36469b7)
  - GoogleServicesFile - by @AugusDogus [(275a5)](https://github.com/AugusDogus/opentab/commit/275a50b)
  - Update .easignore for EAS build compatibility - by @AugusDogus [(a6644)](https://github.com/AugusDogus/opentab/commit/a664432)
  - Use bun native patching for xcode instead of patch-package - by @AugusDogus [(9f396)](https://github.com/AugusDogus/opentab/commit/9f3969c)
- **server:**
  - Add clientPrefix to env config for t3-env compatibility - by @AugusDogus [(4b44b)](https://github.com/AugusDogus/opentab/commit/4b44b39)
  - Configure Vercel deployment for monorepo - by @AugusDogus [(71b60)](https://github.com/AugusDogus/opentab/commit/71b6087)
