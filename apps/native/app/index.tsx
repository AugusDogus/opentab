import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

const StyledIonicons = withUniwind(Ionicons);
const StyledSafeAreaView = withUniwind(SafeAreaView);

function AuthenticatedView({ userName }: { userName: string }) {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const privateData = useQuery(trpc.privateData.queryOptions());

  return (
    <View className="flex-1 p-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-8">
        <View className="flex-row items-center gap-2">
          <Text className="text-emerald-400">✓</Text>
          <Text className="text-sm text-muted">{userName}</Text>
        </View>
        <Pressable
          onPress={() => {
            authClient.signOut();
            queryClient.invalidateQueries();
          }}
          className="active:opacity-50"
        >
          <Text className="text-xs text-muted">sign out</Text>
        </Pressable>
      </View>

      {/* Data sections */}
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-xs tracking-wider uppercase text-muted">health check</Text>
          {healthCheck.isPending ? (
            <Text className="text-sm text-muted">...</Text>
          ) : healthCheck.error ? (
            <Text className="text-sm text-danger">{healthCheck.error.message}</Text>
          ) : (
            <Text className="text-sm text-emerald-400">{healthCheck.data}</Text>
          )}
        </View>

        <View className="gap-2">
          <Text className="text-xs tracking-wider uppercase text-muted">private data</Text>
          {privateData.isPending ? (
            <Text className="text-sm text-muted">...</Text>
          ) : privateData.error ? (
            <Text className="text-sm text-danger">{privateData.error.message}</Text>
          ) : (
            <View>
              <Text className="text-sm text-foreground">{privateData.data?.message}</Text>
              <Text className="mt-1 text-xs text-muted">user: {privateData.data?.user.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Branding */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>
    </View>
  );
}

export default function Home() {
  const { data, isPending, error } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);

  async function handleGitHubSignIn() {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/", // Root path - expo plugin converts to deep link (exp://...)
    });
    setIsLoading(false);
  }

  if (isPending) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted">...</Text>
      </StyledSafeAreaView>
    );
  }

  if (error) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-danger">{error.message}</Text>
      </StyledSafeAreaView>
    );
  }

  if (data?.user) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background">
        <AuthenticatedView userName={data.user.name} />
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      {/* Logo/Title */}
      <View className="items-center gap-2 mb-8">
        <Text className="text-lg font-medium text-foreground">opentab</Text>
        <Text className="text-sm text-muted">sign in to continue</Text>
      </View>

      {/* Sign in button */}
      <Pressable
        onPress={handleGitHubSignIn}
        disabled={isLoading}
        className="w-full flex-row items-center justify-center gap-2 px-4 py-4 rounded-lg bg-surface border border-divider active:opacity-70 disabled:opacity-50"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#a3a3a3" />
        ) : (
          <>
            <StyledIonicons name="logo-github" size={18} className="text-foreground" />
            <Text className="text-sm text-foreground">github</Text>
          </>
        )}
      </Pressable>

      {/* Branding */}
      <View className="absolute bottom-8">
        <Text className="text-xs tracking-widest uppercase text-muted opacity-50">opentab</Text>
      </View>
    </StyledSafeAreaView>
  );
}
