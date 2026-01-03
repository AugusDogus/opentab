import { QueryClientProvider, useMutation } from "@tanstack/react-query"
import { Settings } from "lucide-react"
import { useCallback, useState } from "react"

import { authClient } from "~auth/auth-client"
import { DeviceList } from "~components/device-list"
import { SettingsDialog } from "~components/settings-dialog"
import { SignInView } from "~components/sign-in-view"
import { Avatar, AvatarFallback, AvatarImage } from "~components/ui/avatar"
import { useCurrentTab } from "~hooks/use-current-tab"
import { useDeviceRegistration } from "~hooks/use-device-registration"
import { queryClient, trpc } from "~lib/trpc"

import "~style.css"

function AuthenticatedView({
  userName,
  userImage
}: {
  userName: string
  userImage: string | null | undefined
}) {
  const currentTab = useCurrentTab()
  const { deviceIdentifier } = useDeviceRegistration()
  const [showSettings, setShowSettings] = useState(false)

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const sendTabMutation = useMutation(trpc.tab.send.mutationOptions())

  const handleSendTab = useCallback(() => {
    if (!currentTab?.url || !deviceIdentifier) return

    sendTabMutation.mutate({
      url: currentTab.url,
      title: currentTab.title,
      sourceDeviceIdentifier: deviceIdentifier
    })
  }, [currentTab, deviceIdentifier, sendTabMutation])

  return (
    <div className="p-6 w-80 bg-neutral-950 text-neutral-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            {userImage && <AvatarImage src={userImage} alt={userName} />}
            <AvatarFallback className="text-[9px] bg-neutral-800 text-neutral-400">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-neutral-300">{userName}</span>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors rounded hover:bg-neutral-800"
          title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-neutral-600 uppercase tracking-wider">
            current tab
          </p>
          <p className="text-sm text-neutral-300 truncate">
            {currentTab?.title ?? "..."}
          </p>
        </div>

        <button
          onClick={handleSendTab}
          disabled={!currentTab?.url || sendTabMutation.isPending}
          className="w-full py-3 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {sendTabMutation.isPending ? "Sending..." : "Send to Devices"}
        </button>

        {sendTabMutation.isSuccess && (
          <p className="text-sm text-emerald-400 text-center">
            Sent to{" "}
            {sendTabMutation.data.sentToMobile +
              sendTabMutation.data.sentToExtensions}{" "}
            device(s)
          </p>
        )}

        {sendTabMutation.isError && (
          <p className="text-sm text-red-400 text-center">
            {sendTabMutation.error.message}
          </p>
        )}

        <DeviceList deviceIdentifier={deviceIdentifier} />
      </div>

      <div className="mt-6 pt-4 border-t border-neutral-900">
        <p className="text-xs text-neutral-700 tracking-widest uppercase text-center">
          opentab
        </p>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}

function IndexPopup() {
  const { data, isPending, error } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8 w-80 bg-neutral-950">
        <p className="text-neutral-500 text-sm">...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 w-80 bg-neutral-950 gap-2">
        <p className="text-red-400 text-sm">{error.message}</p>
      </div>
    )
  }

  if (data?.user) {
    return (
      <AuthenticatedView
        userName={data.user.name}
        userImage={data.user.image}
      />
    )
  }

  return <SignInView />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <IndexPopup />
    </QueryClientProvider>
  )
}

export default App
