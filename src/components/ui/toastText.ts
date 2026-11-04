import { Children, isValidElement, type ReactNode } from "react";

export function toastText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child) ? toastText(child.props.children) : "",
    )
    .filter(Boolean)
    .join(" ");
}
