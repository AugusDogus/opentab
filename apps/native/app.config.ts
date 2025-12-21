export default {
  expo: {
    scheme: "opentab",
    userInterfaceStyle: "automatic",
    orientation: "default",
    icon: "./assets/images/icon.png",
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
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE,
    },
    name: "opentab",
    slug: "opentab",
    plugins: ["expo-font", "expo-system-ui", "expo-web-browser"],
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
