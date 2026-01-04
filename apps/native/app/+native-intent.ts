import { getShareExtensionKey } from "expo-share-intent";

export function redirectSystemPath({ path }: { path: string; initial: string }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      // Redirect share intent deep links to the share screen
      console.debug("[native-intent] redirecting share intent to /share");
      return "/share";
    }
    return path;
  } catch {
    return "/";
  }
}
