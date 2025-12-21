import Constants from "expo-constants";
import { isDevice } from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      throw new Error("Failed to get push notification permissions");
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      throw new Error("Project ID is not set");
    }

    try {
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      console.log("Push token:", pushToken.data);
      return pushToken.data;
    } catch (error) {
      throw new Error("Failed to get push token", { cause: error });
    }
  } else {
    throw new Error("Not a device");
  }
}
