import { Show } from "solid-js"
import { Tabs } from "@opencode-ai/ui/tabs"
import { useLanguage } from "@/context/language"
import { usePlatform } from "@/context/platform"

export function SessionMobileTabs(props: {
  open: boolean
  mobileTab: "session" | "changes"
  hasReview: boolean
  reviewCount: number
  onSession: () => void
  onChanges: () => void
}) {
  const language = useLanguage()
  const platform = usePlatform()

  const handleSession = () => {
    platform.haptic?.("light")
    props.onSession()
  }
  const handleChanges = () => {
    platform.haptic?.("light")
    props.onChanges()
  }

  return (
    <Show when={props.open}>
      <Tabs value={props.mobileTab} class="h-auto">
        <Tabs.List class="!h-9">
          <Tabs.Trigger
            value="session"
            class="!w-1/2 !max-w-none"
            classes={{ button: "w-full" }}
            onClick={handleSession}
          >
            {language.t("session.tab.session")}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="changes"
            class="!w-1/2 !max-w-none !border-r-0"
            classes={{ button: "w-full" }}
            onClick={handleChanges}
          >
            {props.hasReview
              ? language.t("session.review.filesChanged", { count: props.reviewCount })
              : language.t("session.review.change.other")}
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>
    </Show>
  )
}
