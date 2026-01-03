import { useMutation, useQuery } from "@tanstack/react-query"
import { Monitor, Smartphone, Trash2 } from "lucide-react"
import { useCallback, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "~components/ui/alert-dialog"
import { trpc } from "~lib/trpc"

interface DeviceListProps {
  deviceIdentifier: string
}

export function DeviceList({ deviceIdentifier }: DeviceListProps) {
  const devices = useQuery(trpc.device.list.queryOptions())
  const [deviceToRemove, setDeviceToRemove] = useState<{
    id: string
    name: string
  } | null>(null)

  const removeDeviceMutation = useMutation(
    trpc.device.remove.mutationOptions({
      onSuccess: () => {
        devices.refetch()
        setDeviceToRemove(null)
      }
    })
  )

  const handleConfirmRemove = useCallback(() => {
    if (deviceToRemove) {
      removeDeviceMutation.mutate({ deviceId: deviceToRemove.id })
    }
  }, [deviceToRemove, removeDeviceMutation])

  return (
    <>
      <div className="space-y-2 pt-4 border-t border-neutral-900">
        <p className="text-xs text-neutral-600 uppercase tracking-wider">
          devices
        </p>
        {devices.isPending ? (
          <p className="text-sm text-neutral-500">...</p>
        ) : devices.error ? (
          <p className="text-sm text-red-400">{devices.error.message}</p>
        ) : (
          <div className="space-y-0.5">
            {devices.data?.map((device) => {
              const isCurrentDevice =
                device.deviceIdentifier === deviceIdentifier
              return (
                <div
                  key={device.id}
                  className="flex items-center gap-2 group text-neutral-300 py-1">
                  {device.deviceType === "mobile" ? (
                    <Smartphone
                      className={`w-4 h-4 flex-shrink-0 ${isCurrentDevice ? "text-emerald-400" : ""}`}
                    />
                  ) : (
                    <Monitor
                      className={`w-4 h-4 flex-shrink-0 ${isCurrentDevice ? "text-emerald-400" : ""}`}
                    />
                  )}
                  <span className="text-sm flex-1 truncate">
                    {device.deviceName ?? device.deviceType}
                  </span>
                  <button
                    onClick={() =>
                      setDeviceToRemove({
                        id: device.id,
                        name: device.deviceName ?? device.deviceType
                      })
                    }
                    disabled={removeDeviceMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 transition-all disabled:opacity-50"
                    title="Remove device">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
            {devices.data?.length === 0 && (
              <p className="text-sm text-neutral-500">No devices registered</p>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={deviceToRemove !== null}
        onOpenChange={(open) => !open && setDeviceToRemove(null)}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-100">
              Remove device
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Remove "{deviceToRemove?.name}" from your devices? You can
              re-register it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={removeDeviceMutation.isPending}
              className="bg-red-900 text-red-200 hover:bg-red-800">
              {removeDeviceMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
