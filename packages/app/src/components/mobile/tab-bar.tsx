import { useLocation, useNavigate } from "@solidjs/router"
import { createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { usePlatform } from "@/context/platform"
import { SafeArea } from "./safe-area"

export function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const platform = usePlatform()

  const activeTab = createMemo<"home" | "sessions">(() => {
    const path = location.pathname
    if (path === "/") return "home"
    return "sessions"
  })

  function onTabClick(tab: "home" | "sessions") {
    platform.haptic?.("light")
    if (tab === "home") navigate("/")
    else navigate("/")
  }

  return (
    <SafeArea class="fixed bottom-0 left-0 right-0 z-50 bg-background-base border-t border-border-weak-base">
      <nav class="flex items-center justify-around h-[50px] px-2">
        <button
          type="button"
          onClick={() => onTabClick("home")}
          class="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-md transition-colors hover:bg-surface-raised-base-hover active:bg-surface-raised-base-active"
          classList={{
            "text-icon-active": activeTab() === "home",
            "text-icon-base": activeTab() !== "home",
          }}
        >
          <Icon name="sidebar" size="small" />
          <span class="text-10-medium">Home</span>
        </button>
        <button
          type="button"
          onClick={() => onTabClick("sessions")}
          class="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-md transition-colors hover:bg-surface-raised-base-hover active:bg-surface-raised-base-active"
          classList={{
            "text-icon-active": activeTab() === "sessions",
            "text-icon-base": activeTab() !== "sessions",
          }}
        >
          <Icon name="new-session" size="small" />
          <span class="text-10-medium">Sessions</span>
        </button>
        <button
          type="button"
          onClick={() => onTabClick("home")}
          class="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-md transition-colors hover:bg-surface-raised-base-hover active:bg-surface-raised-base-active"
          classList={{
            "text-icon-base": true,
          }}
        >
          <Icon name="settings-gear" size="small" />
          <span class="text-10-medium">Settings</span>
        </button>
      </nav>
    </SafeArea>
  )
}
