import { createSignal } from "solid-js";

/**
 * Like `createSignal<boolean>` but remembers whatever element had focus when
 * opened (the trigger button) and restores focus to it on close. Our
 * Dialogs/Drawers are controlled externally (a plain button calls
 * `setOpen(true)`) rather than via Kobalte's own `<Dialog.Trigger>`, so
 * Kobalte has no trigger reference of its own to restore focus to — without
 * this, focus drops to `<body>` when Escape/overlay-click/close-button closes
 * the dialog, failing the "focus returns to trigger" a11y requirement.
 */
export function createDialogOpenState() {
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLElement | null = null;

  const set = (next: boolean) => {
    if (next) {
      trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    } else if (trigger) {
      // Deferred: Kobalte's own Dialog cleanup runs its focus handling right
      // after this callback (since we control `open` ourselves instead of
      // using `<Dialog.Trigger>`, it has no trigger of its own to return to
      // and settles on `<body>`) — restoring on the next tick lets ours win.
      const el = trigger;
      trigger = null;
      setTimeout(() => el.focus(), 0);
    }
    setOpen(next);
  };

  return [open, set] as const;
}
