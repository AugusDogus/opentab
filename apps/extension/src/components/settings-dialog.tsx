import { AlertTriangle, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { authClient } from "~/auth/auth-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { queryClient } from "~/lib/trpc";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      await authClient.deleteUser();
      queryClient.clear();
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeleting(false);
      setShowDeleteAccount(false);
    }
  }, []);

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-100">Settings</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <button
              onClick={() => {
                authClient.signOut();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
            <div className="border-t border-neutral-800 my-2" />
            <button
              onClick={() => {
                onOpenChange(false);
                setShowDeleteAccount(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteAccount}
        onOpenChange={(open) => !isDeleting && setShowDeleteAccount(open)}
      >
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <AlertDialogTitle className="text-neutral-100">Delete Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-neutral-400">
              Are you sure you want to delete your account? This action cannot be undone. All your
              data, including registered devices, will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-900 text-red-200 hover:bg-red-800"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
