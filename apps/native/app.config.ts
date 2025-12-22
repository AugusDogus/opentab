import packageJson from "./package.json";

export default {
  expo: {
    version: packageJson.version,
    scheme: "opentab",
    userInterfaceStyle: "automatic",
    orientation: "default",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/android-icon-monochrome.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      icon: "./assets/images/icon.png",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      package: "com.augusdogus.opentab",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    name: "opentab",
    slug: "opentab",
    plugins: [
      "expo-font",
      "expo-system-ui",
      "expo-web-browser",
      "@rnrepo/expo-config-plugin",
      [
        "expo-share-intent",
        {
          // iOS: Enable URL and webpage sharing
          iosActivationRules: {
            NSExtensionActivationSupportsWebURLWithMaxCount: 1,
            NSExtensionActivationSupportsWebPageWithMaxCount: 1,
            NSExtensionActivationSupportsText: true,
          },
          // Android: Enable text/URL sharing
          androidIntentFilters: ["text/*"],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: "7ef223ab-064a-4cf1-98f1-b5574e63cec2",
      },
    },
    owner: "augusdogus",
  },
};
