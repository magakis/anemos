import { createMemo, createSignal, onCleanup, onMount } from "solid-js"

export const useReducedMotion = () => {
  const [matches, setMatches] = createSignal(false)

  onMount(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setMatches(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mediaQuery.addEventListener("change", handler)

    onCleanup(() => {
      mediaQuery.removeEventListener("change", handler)
    })
  })

  return matches
}