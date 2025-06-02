import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function DeleteDialog({
  onConfirm,
  children,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 max-w-sm w-full -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Confirm Delete
            </h2>
            <Dialog.Close asChild>
              <button className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="text-sm px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200">
                Cancel
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                onClick={onConfirm}
                className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
