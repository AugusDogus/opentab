/**
 * Vanilla JS Realtime Client
 * Based on @upstash/realtime provider.tsx but without React dependencies
 * Handles SSE connections with proper reconnection, backoff, and message recovery
 *
 * NOTE: This client was created because @upstash/realtime only exports React hooks.
 * If Upstash adds a vanilla JS client in the future, consider migrating to that.
 * @see https://github.com/upstash/realtime
 */

import { z } from "zod"

// Event types from @upstash/realtime
const systemEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connected"),
    channel: z.string(),
    cursor: z.string().optional()
  }),
  z.object({ type: z.literal("reconnect"), timestamp: z.number() }),
  z.object({ type: z.literal("error"), error: z.string() }),
  z.object({ type: z.literal("disconnected"), channels: z.array(z.string()) }),
  z.object({ type: z.literal("ping"), timestamp: z.number() })
])

const userEvent = z.object({
  id: z.string(),
  data: z.unknown(),
  event: z.string(),
  channel: z.string()
})

type SystemEvent = z.infer<typeof systemEvent>
type UserEvent = z.infer<typeof userEvent>
type RealtimeMessage = SystemEvent | UserEvent
type ConnectionStatus = "connected" | "disconnected" | "error" | "connecting"

export interface RealtimeClientOptions {
  /** Base URL for the realtime API endpoint */
  url: string
  /** Whether to include credentials in requests */
  withCredentials?: boolean
  /** Maximum number of reconnection attempts before giving up */
  maxReconnectAttempts?: number
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void
}

export interface SubscriptionOptions {
  /** Channel(s) to subscribe to */
  channels: string[]
  /** Event names to filter (optional - receives all if not specified) */
  events?: string[]
  /** Callback when data is received */
  onData: (payload: { event: string; data: unknown; channel: string }) => void
}

const PING_TIMEOUT_MS = 75_000

export class RealtimeClient {
  private url: string
  private withCredentials: boolean
  private maxReconnectAttempts: number
  private onStatusChange?: (status: ConnectionStatus) => void

  private status: ConnectionStatus = "disconnected"
  private eventSource: EventSource | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private pingTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private lastAck = new Map<string, string>()
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null

  private subscriptions = new Map<
    string,
    {
      channels: Set<string>
      events?: string[]
      cb: (msg: RealtimeMessage) => void
    }
  >()

  constructor(options: RealtimeClientOptions) {
    this.url = options.url
    this.withCredentials = options.withCredentials ?? false
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 3
    this.onStatusChange = options.onStatusChange
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.onStatusChange?.(status)
  }

  private getAllNeededChannels(): Set<string> {
    const channels = new Set<string>()
    this.subscriptions.forEach((sub) => {
      sub.channels.forEach((ch) => channels.add(ch))
    })
    return channels
  }

  private cleanup() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }

    this.reconnectAttempts = 0
    this.setStatus("disconnected")
  }

  private resetPingTimeout() {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
    }

    this.pingTimeout = setTimeout(() => {
      console.warn("[RealtimeClient] Connection timed out, reconnecting...")
      this.connect()
    }, PING_TIMEOUT_MS)
  }

  private connect(opts?: { replayEventsSince?: number }) {
    const replayEventsSince = opts?.replayEventsSince ?? Date.now()
    const channels = Array.from(this.getAllNeededChannels())

    if (channels.length === 0) return

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[RealtimeClient] Max reconnection attempts reached.")
      this.setStatus("error")
      return
    }

    // Clean up existing connection
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }

    this.setStatus("connecting")

    try {
      const channelsParam = channels
        .map((ch) => `channel=${encodeURIComponent(ch)}`)
        .join("&")

      const lastAckParam = channels
        .map((c) => {
          const lastAck = this.lastAck.get(c) ?? String(replayEventsSince)
          return `last_ack_${encodeURIComponent(c)}=${encodeURIComponent(lastAck)}`
        })
        .join("&")

      const url = this.url + "?" + channelsParam + "&" + lastAckParam

      const eventSource = new EventSource(url, {
        withCredentials: this.withCredentials
      })
      this.eventSource = eventSource

      eventSource.onopen = () => {
        this.reconnectAttempts = 0
        this.setStatus("connected")
        this.resetPingTimeout()
      }

      eventSource.onmessage = (evt) => {
        try {
          const payload: RealtimeMessage = JSON.parse(evt.data)
          this.resetPingTimeout()

          this.handleMessage(payload)

          const systemResult = systemEvent.safeParse(payload)

          if (systemResult.success) {
            if (systemResult.data.type === "reconnect") {
              this.connect({ replayEventsSince: systemResult.data.timestamp })
            }
          }
        } catch (error) {
          console.warn("[RealtimeClient] Error parsing message:", error)
        }
      }

      eventSource.onerror = () => {
        if (eventSource !== this.eventSource) return

        const readyState = this.eventSource?.readyState
        if (readyState === EventSource.CONNECTING) return

        if (readyState === EventSource.CLOSED) {
          console.log("[RealtimeClient] Connection closed, reconnecting...")
        }

        this.setStatus("disconnected")

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          const delay = Math.min(1000 * this.reconnectAttempts, 10000)
          console.log(
            `[RealtimeClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          )
          this.reconnectTimeout = setTimeout(() => {
            this.connect()
          }, delay)
        } else {
          this.setStatus("error")
        }
      }
    } catch (error) {
      console.error("[RealtimeClient] Connection error:", error)
      this.setStatus("error")
    }
  }

  private debouncedConnect() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.debounceTimeout = setTimeout(() => {
      this.connect()
      this.debounceTimeout = null
    }, 25)
  }

  private handleMessage(payload: RealtimeMessage) {
    const systemResult = systemEvent.safeParse(payload)

    if (systemResult.success) {
      const event = systemResult.data
      if (event.type === "connected") {
        if (event.cursor) {
          this.lastAck.set(event.channel, event.cursor)
        }
      }
      return
    }

    const event = userEvent.safeParse(payload)

    if (event.success) {
      this.lastAck.set(event.data.channel, event.data.id)

      this.subscriptions.forEach((sub) => {
        if (sub.channels.has(event.data.channel)) {
          sub.cb(payload)
        }
      })
    }
  }

  /**
   * Subscribe to realtime events
   * @returns Unsubscribe function
   */
  subscribe(options: SubscriptionOptions): () => void {
    const id = Math.random().toString(36).substring(2)

    this.subscriptions.set(id, {
      channels: new Set(options.channels),
      events: options.events,
      cb: (msg) => {
        const result = userEvent.safeParse(msg)

        if (result.success) {
          const { event, channel, data } = result.data

          // Filter by event names if specified
          if (
            options.events &&
            options.events.length > 0 &&
            !options.events.includes(event)
          ) {
            return
          }

          options.onData({ event, data, channel })
        }
      }
    })

    this.debouncedConnect()

    // Return unsubscribe function
    return () => {
      const channels = Array.from(this.subscriptions.get(id)?.channels ?? [])

      channels.forEach((channel) => {
        this.lastAck.delete(channel)
      })

      this.subscriptions.delete(id)

      if (this.subscriptions.size === 0) {
        this.cleanup()

        if (this.debounceTimeout) {
          clearTimeout(this.debounceTimeout)
          this.debounceTimeout = null
        }

        return
      }

      this.debouncedConnect()
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * Manually disconnect and clean up
   */
  disconnect() {
    this.subscriptions.clear()
    this.cleanup()
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
      this.debounceTimeout = null
    }
  }

  /**
   * Force reconnection (resets attempt counter)
   */
  reconnect() {
    this.reconnectAttempts = 0
    this.connect()
  }
}
