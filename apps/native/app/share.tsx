import { Ionicons } from '@expo/vector-icons';
import { Spinner } from 'heroui-native';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { useShareIntent } from '~/hooks/use-share-intent';

const StyledIonicons = withUniwind(Ionicons);
const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function ShareScreen() {
  const { sendError, showIOSSuccess } = useShareIntent();

  // Success state
  if (showIOSSuccess) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <View className="items-center gap-4">
          <View className="size-16 rounded-full bg-success/20 items-center justify-center">
            <StyledIonicons
              name="checkmark"
              size={32}
              className="text-success"
            />
          </View>
          <Text className="text-xl font-medium text-foreground">Tab sent!</Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  // Error state
  if (sendError) {
    return (
      <StyledSafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <View className="items-center gap-4">
          <View className="size-16 rounded-full bg-danger/20 items-center justify-center">
            <StyledIonicons name="close" size={32} className="text-danger" />
          </View>
          <Text className="text-xl font-medium text-foreground">
            Failed to send
          </Text>
          <Text className="text-sm text-muted text-center">
            {sendError.message}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  // Loading/sending state
  return (
    <StyledSafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      <View className="items-center gap-4">
        <Spinner size="lg" />
        <Text className="text-sm text-muted">Sending tab...</Text>
      </View>
    </StyledSafeAreaView>
  );
}
