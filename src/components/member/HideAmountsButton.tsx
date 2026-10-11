"use client";

import { useAmountVisibility } from "@/lib/hide-amounts";
import { HeaderIconButton } from "./HeaderIconButton";
import { EyeIcon, EyeOffIcon } from "./MemberIcons";

/** Eye button for page headers: masks / reveals every amount on screen. */
export function HideAmountsButton() {
  const { hidden, toggleHidden } = useAmountVisibility();
  return (
    <HeaderIconButton
      label={hidden ? "Show amounts" : "Hide amounts"}
      onClick={toggleHidden}
      aria-pressed={hidden}
    >
      {hidden ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
    </HeaderIconButton>
  );
}
