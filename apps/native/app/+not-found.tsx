import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 justify-center items-center p-6 bg-background">
        <Text className="mb-4 text-6xl">🤔</Text>
        <Text className="mb-2 text-2xl font-semibold text-foreground">Page Not Found</Text>
        <Text className="mb-6 text-center text-muted">
              Sorry, the page you're looking for doesn't exist.
        </Text>
            <Link href="/" asChild>
          <Pressable className="px-6 py-3 rounded-lg bg-accent active:opacity-70">
            <Text className="text-base font-medium text-white">Go to Home</Text>
              </Pressable>
            </Link>
        </View>
    </>
  );
}
