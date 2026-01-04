import { getShareExtensionKey } from "expo-share-intent";

export function redirectSystemPath({ path }: { path: string; initial: string }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      // Redirect share intent deep links to index where useShareIntent handles them
      console.debug("[native-intent] redirecting share intent to /");
      return "/";
    }
    return path;
  } catch {
    return "/";
  }
}
