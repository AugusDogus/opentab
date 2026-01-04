import type { Variants } from "motion/react";

import Footer from "~/app/components/home/footer";
import Header from "~/app/components/home/header";
import { Apple, Chrome, GooglePlay } from "~/app/components/icons";
import { AnimatedGroup } from "~/app/components/ui/animated-group";
import { URLS } from "~/lib/urls";

const transitionVariants: { item: Variants } = {
  item: {
    hidden: {
      opacity: 0,
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function Hero() {
  return (
    <div className="font-geist flex w-full flex-1 flex-col items-center justify-center gap-12 overflow-hidden px-4 pt-32 md:gap-16">
      <Header />
      <AnimatedGroup variants={transitionVariants} className="w-full">
        <div className="relative flex w-full flex-col gap-12 px-4 md:px-6">
          <div className="relative mx-auto w-full max-w-3xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl">
            <div className="flex flex-col items-center justify-center gap-8 text-center md:gap-12 lg:gap-12">
              <h1 className="text-4xl leading-tight max-w-lg md:text-5xl">
                Send tabs to your devices instantly
              </h1>
              <p className="mx-auto max-w-xs text-pretty text-sm leading-tight sm:text-[16px]">
                Fast, seamless tab sharing between your browser and mobile devices.
              </p>
            </div>
          </div>
          <div className="mx-auto flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={URLS.APP_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-6 py-3 font-medium backdrop-blur-sm transition-colors hover:bg-accent"
              >
                <Apple className="size-5" />
                App Store
              </a>
              <a
                href={URLS.PLAY_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-6 py-3 font-medium backdrop-blur-sm transition-colors hover:bg-accent"
              >
                <GooglePlay className="size-5" />
                Play Store
              </a>
              <a
                href={URLS.GITHUB_RELEASES}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-6 py-3 font-medium backdrop-blur-sm transition-colors hover:bg-accent"
              >
                <Chrome className="size-5" />
                Browser Extension
              </a>
            </div>
          </div>
        </div>
      </AnimatedGroup>

      <AnimatedGroup
        variants={{
          container: {
            visible: {
              transition: {
                staggerChildren: 0.05,
                delayChildren: 0.25,
              },
            },
          },
          ...transitionVariants,
        }}
      >
        <div className="backdrop-blur-xs mx-auto w-full max-w-3xl rounded-xl border border-border bg-gray-50/5 p-2 sm:min-w-0 sm:max-w-4xl sm:translate-x-0">
          <video
            src="https://github.com/user-attachments/assets/60071e12-d41b-4a6e-8a07-7e61c8cceec4"
            className="z-10 ml-0 block h-auto w-full rounded-lg object-cover sm:mx-auto"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </AnimatedGroup>
      <Footer />
    </div>
  );
}
