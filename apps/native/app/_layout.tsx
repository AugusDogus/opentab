import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ThemeToggle } from "@/components/theme-toggle";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { queryClient } from "@/utils/trpc";

// This allows the in-app browser to close after OAuth completes
WebBrowser.maybeCompleteAuthSession();

function StackLayout() {
  const foregroundColor = useThemeColor("foreground");
  const backgroundColor = useThemeColor("background");

  return (
    <Stack
      screenOptions={{
        headerTintColor: foregroundColor,
        headerStyle: { backgroundColor },
        headerTitleStyle: { fontWeight: "600", color: foregroundColor },
        headerRight: () => <ThemeToggle />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <StackLayout />
            </HeroUINativeProvider>
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
