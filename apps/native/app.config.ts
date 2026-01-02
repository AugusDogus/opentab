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
      bundleIdentifier: "sh.opentab",
      icon: "./assets/images/icon.png",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      package: "sh.opentab",
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
        "expo-notifications",
        {
          icon: "./assets/images/android-icon-monochrome.png",
          color: "#000000",
        },
      ],
      [
        "expo-share-intent",
        {
          iosActivationRules: {
            NSExtensionActivationSupportsWebURLWithMaxCount: 1,
            NSExtensionActivationSupportsWebPageWithMaxCount: 1,
            NSExtensionActivationSupportsText: true,
          },
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
