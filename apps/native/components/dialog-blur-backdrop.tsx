import { Dialog, useDialogAnimation } from "heroui-native";
import { StyleSheet } from "react-native";
import { interpolate, useDerivedValue } from "react-native-reanimated";

import { AnimatedBlurView } from "./animated-blur-view";

export const DialogBlurBackdrop = () => {
  const { progress, isDragging, isGestureReleaseAnimationRunning } = useDialogAnimation();

  const blurIntensity = useDerivedValue(() => {
    const maxIntensity = 50; // Dark mode intensity

    if (
      (isDragging.get() || isGestureReleaseAnimationRunning.get()) &&
      progress.get() <= 1
    ) {
      return maxIntensity;
    }

    return interpolate(progress.get(), [0, 1, 2], [0, maxIntensity, 0]);
  });

  return (
    <Dialog.Close style={StyleSheet.absoluteFill}>
      <AnimatedBlurView
        blurIntensity={blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
    </Dialog.Close>
  );
};

