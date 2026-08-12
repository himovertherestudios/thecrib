"use client";

import { Button } from "./Button";
import type { ComponentProps } from "react";

/**
 * A submit button for a destructive form action that asks for
 * confirmation first. preventDefault on the click stops the form's
 * native submit — the server action never runs if the user cancels.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
