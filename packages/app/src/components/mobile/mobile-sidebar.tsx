import { type ParentProps } from "solid-js"
import { useLayout } from "@/context/layout"

export function MobileSidebar(props: ParentProps) {
  const layout = useLayout()

  return (
    <>
      {/* Backdrop overlay */}
      <div
        classList={{
          "fixed inset-0 z-40 transition-opacity duration-200": true,
          "opacity-100 pointer-events-auto": layout.mobileSidebar.opened(),
          "opacity-0 pointer-events-none": !layout.mobileSidebar.opened(),
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) layout.mobileSidebar.hide()
        }}
      />

      {/* Slide-in sidebar panel */}
      <nav
        aria-label="Projects and sessions"
        data-component="sidebar-nav-mobile"
        classList={{
          "@container fixed top-0 bottom-0 left-0 z-50 w-full max-w-[400px] overflow-hidden border-r border-border-weaker-base bg-background-base transition-transform duration-200 ease-out": true,
          "translate-x-0": layout.mobileSidebar.opened(),
          "-translate-x-full": !layout.mobileSidebar.opened(),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {props.children}
      </nav>
    </>
  )
}
