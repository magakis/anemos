import { Show, type Accessor } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { Icon } from "@opencode-ai/ui/icon"
import { useLayout } from "@/context/layout"
import { SafeArea } from "./safe-area"

export function MobileHeader(props: {
  title: string | Accessor<string>
  showBack?: boolean | Accessor<boolean>
  onBack?: () => void
  showMenu?: boolean
}) {
  const navigate = useNavigate()
  const layout = useLayout()

  const resolvedTitle = () => (typeof props.title === "function" ? (props.title as Accessor<string>)() : props.title)
  const showBack = () => (typeof props.showBack === "function" ? (props.showBack as Accessor<boolean>)() : props.showBack)

  function handleBack() {
    if (props.onBack) {
      props.onBack()
      return
    }
    navigate(-1)
  }

  function handleMenu() {
    layout.mobileSidebar.toggle()
  }

  return (
    <SafeArea class="sticky top-0 left-0 right-0 z-40 bg-background-base border-b border-border-weak-base">
      <header class="flex items-center h-11 px-3 gap-2">
        <Show when={showBack()}>
          <button
            type="button"
            onClick={handleBack}
            class="flex items-center justify-center size-8 rounded-md hover:bg-surface-raised-base-hover active:bg-surface-raised-base-active shrink-0"
            aria-label="Back"
          >
            <Icon name="chevron-left" size="small" />
          </button>
        </Show>

        <div class="flex-1 min-w-0">
          <h1 class="text-14-medium text-text-strong truncate">{resolvedTitle()}</h1>
        </div>

        <Show when={props.showMenu}>
          <button
            type="button"
            onClick={handleMenu}
            class="flex items-center justify-center size-8 rounded-md hover:bg-surface-raised-base-hover active:bg-surface-raised-base-active shrink-0"
            aria-label="Menu"
          >
            <Icon name="menu" size="small" />
          </button>
        </Show>
      </header>
    </SafeArea>
  )
}
