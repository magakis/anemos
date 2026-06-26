import { type ParentProps } from "solid-js"

export function SafeArea(props: ParentProps<{ class?: string }>) {
  return (
    <div
      class={props.class ?? ""}
      style={{
        "padding-top": "env(safe-area-inset-top, 0px)",
        "padding-bottom": "env(safe-area-inset-bottom, 0px)",
        "padding-left": "env(safe-area-inset-left, 0px)",
        "padding-right": "env(safe-area-inset-right, 0px)",
      }}
    >
      {props.children}
    </div>
  )
}
