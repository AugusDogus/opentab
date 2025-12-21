import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { authClient } from "~auth/auth-client"
import { queryClient, trpc } from "~lib/trpc"

import "~style.css"

function AuthenticatedView({ userName }: { userName: string }) {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions())
  const privateData = useQuery(trpc.privateData.queryOptions())

  return (
    <div className="plasmo-p-6 plasmo-w-80 plasmo-bg-neutral-950 plasmo-text-neutral-100">
      {/* Header */}
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-6">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <span className="plasmo-text-emerald-400">✓</span>
          <span className="plasmo-text-sm plasmo-text-neutral-400">
            {userName}
          </span>
        </div>
        <button
          onClick={() => authClient.signOut()}
          className="plasmo-text-xs plasmo-text-neutral-600 hover:plasmo-text-neutral-400 plasmo-transition-colors">
          sign out
        </button>
      </div>

      {/* Data sections */}
      <div className="plasmo-space-y-4">
        <div className="plasmo-space-y-2">
          <p className="plasmo-text-xs plasmo-text-neutral-600 plasmo-uppercase plasmo-tracking-wider">
            health check
          </p>
          {healthCheck.isPending ? (
            <p className="plasmo-text-sm plasmo-text-neutral-500">...</p>
          ) : healthCheck.error ? (
            <p className="plasmo-text-sm plasmo-text-red-400">
              {healthCheck.error.message}
            </p>
          ) : (
            <p className="plasmo-text-sm plasmo-text-emerald-400">
              {healthCheck.data}
            </p>
          )}
        </div>

        <div className="plasmo-space-y-2">
          <p className="plasmo-text-xs plasmo-text-neutral-600 plasmo-uppercase plasmo-tracking-wider">
            private data
          </p>
          {privateData.isPending ? (
            <p className="plasmo-text-sm plasmo-text-neutral-500">...</p>
          ) : privateData.error ? (
            <p className="plasmo-text-sm plasmo-text-red-400">
              {privateData.error.message}
            </p>
          ) : (
            <div>
              <p className="plasmo-text-sm plasmo-text-neutral-300">
                {privateData.data?.message}
              </p>
              <p className="plasmo-text-xs plasmo-text-neutral-600 plasmo-mt-1">
                user: {privateData.data?.user.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Branding */}
      <div className="plasmo-mt-8 plasmo-pt-4 plasmo-border-t plasmo-border-neutral-900">
        <p className="plasmo-text-xs plasmo-text-neutral-700 plasmo-tracking-widest plasmo-uppercase plasmo-text-center">
          opentab
        </p>
      </div>
    </div>
  )
}

function IndexPopup() {
  const { data, isPending, error } = authClient.useSession()
  const [isLoading, setIsLoading] = useState(false)

  async function handleGitHubSignIn() {
    setIsLoading(true)

    const result = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/auth/success"
    })

    if (result.data?.url) {
      chrome.tabs.create({ url: result.data.url })

      const pollInterval = setInterval(async () => {
        const session = await authClient.getSession()
        if (session.data?.user) {
          clearInterval(pollInterval)
          setIsLoading(false)
          window.location.reload()
        }
      }, 1000)

      setTimeout(() => {
        clearInterval(pollInterval)
        setIsLoading(false)
      }, 120000)
    } else {
      setIsLoading(false)
    }
  }

  if (isPending) {
    return (
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-p-8 plasmo-w-80 plasmo-bg-neutral-950">
        <p className="plasmo-text-neutral-500 plasmo-text-sm">...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-8 plasmo-w-80 plasmo-bg-neutral-950 plasmo-gap-2">
        <p className="plasmo-text-red-400 plasmo-text-sm">{error.message}</p>
      </div>
    )
  }

  if (data?.user) {
    return <AuthenticatedView userName={data.user.name} />
  }

  return (
    <div className="plasmo-p-8 plasmo-w-80 plasmo-bg-neutral-950 plasmo-text-neutral-100 plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-6">
      {/* Logo/Title */}
      <div className="plasmo-text-center plasmo-space-y-2">
        <h1 className="plasmo-text-lg plasmo-font-medium">opentab</h1>
        <p className="plasmo-text-neutral-500 plasmo-text-sm">
          sign in to continue
        </p>
      </div>

      {/* Sign in button */}
      <button
        onClick={handleGitHubSignIn}
        disabled={isLoading}
        className="plasmo-w-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-2 plasmo-px-4 plasmo-py-3 plasmo-bg-neutral-900 plasmo-text-neutral-300 plasmo-rounded plasmo-text-sm plasmo-border plasmo-border-neutral-800 hover:plasmo-border-neutral-700 hover:plasmo-text-neutral-100 plasmo-transition-all disabled:plasmo-opacity-50">
        <svg
          className="plasmo-w-4 plasmo-h-4"
          fill="currentColor"
          viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        {isLoading ? "..." : "github"}
      </button>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <IndexPopup />
    </QueryClientProvider>
  )
}

export default App
