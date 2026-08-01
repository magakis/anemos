import { createEffect, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { usePlatform } from "@/context/platform"
import { useSettings } from "@/context/settings"
import { persisted } from "@/utils/persist"
import { DialogReleaseNotes, type Highlight } from "@/components/dialog-release-notes"

const CHANGELOG_URL = "https://opencode.ai/changelog.json"

type Store = {
  version?: string
}

type ParsedRelease = {
  tag?: string
  highlights: Highlight[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const text = value.trim()
    return text.length > 0 ? text : undefined
  }

  if (typeof value === "number") return String(value)
  return
}

function normalizeVersion(value: string | undefined) {
  const text = value?.trim()
  if (!text) return
  return text.startsWith("v") || text.startsWith("V") ? text.slice(1) : text
}

function parseMedia(value: unknown, alt: string): Highlight["media"] | undefined {
  if (!isRecord(value)) return
  const type = getText(value.type)?.toLowerCase()
  const src = getText(value.src) ?? getText(value.url)
  if (!src) return
  if (type !== "image" && type !== "video") return

  return { type, src, alt }
}

function parseHighlight(value: unknown): Highlight | undefined {
  if (!isRecord(value)) return

  const title = getText(value.title)
  if (!title) return

  const description = getText(value.description) ?? getText(value.shortDescription)
  if (!description) return

  const media = parseMedia(value.media, title)
  return { title, description, media }
}

function parseRelease(value: unknown, platform: string): ParsedRelease | undefined {
  if (!isRecord(value)) return
  const tag = getText(value.tag) ?? getText(value.tag_name) ?? getText(value.name)

  // Old format: value.highlights with source+items groups
  if (Array.isArray(value.highlights) && value.highlights.length > 0) {
    const h = value.highlights.flatMap((group) => {
      if (!isRecord(group)) return []

      const source = getText(group.source)
      if (!source) return []
      if (!source.toLowerCase().includes("desktop")) return []

      if (Array.isArray(group.items)) {
        return group.items.map((item) => parseHighlight(item)).filter((item): item is Highlight => item !== undefined)
      }

      const item = parseHighlight(group)
      if (!item) return []
      return [item]
    })

    return { tag, highlights: h }
  }

  // New format: value.sections with title+items arrays
  if (Array.isArray(value.sections)) {
    const hasMobileSection = value.sections.some((s) => {
      if (!isRecord(s)) return false
      const t = getText(s.title)?.toLowerCase()
      return t ? ["mobile", "ios", "android"].some((kw) => t.includes(kw)) : false
    })

    const h = value.sections.flatMap((section) => {
      if (!isRecord(section)) return []
      const title = getText(section.title)
      if (!title) return []
      if (!Array.isArray(section.items)) return []

      const items = section.items
        .map((item) => {
          const text = getText(item)
          if (!text) return undefined
          return { title, description: text } as Highlight
        })
        .filter((item): item is Highlight => item !== undefined)

      if (items.length === 0) return []

      const tl = title.toLowerCase()
      switch (platform) {
        case "desktop":
          return tl.includes("desktop") || tl === "core" ? items : []
        case "web":
          return tl === "core" ? items : []
        case "ios":
        case "android":
          if (hasMobileSection) {
            return ["mobile", "ios", "android"].some((kw) => tl.includes(kw)) ? items : []
          }
          return items
        default:
          return items
      }
    })

    return { tag, highlights: h }
  }

  return { tag, highlights: [] }
}

function parseChangelog(value: unknown, platform: string): ParsedRelease[] | undefined {
  if (Array.isArray(value)) {
    return value.map((v) => parseRelease(v, platform)).filter((release): release is ParsedRelease => release !== undefined)
  }

  if (!isRecord(value)) return
  if (!Array.isArray(value.releases)) return

  return value.releases.map((v) => parseRelease(v, platform)).filter((release): release is ParsedRelease => release !== undefined)
}

function sliceHighlights(input: { releases: ParsedRelease[]; current?: string; previous?: string }) {
  const current = normalizeVersion(input.current)
  const previous = normalizeVersion(input.previous)
  const releases = input.releases

  const start = (() => {
    if (!current) return 0
    const index = releases.findIndex((release) => normalizeVersion(release.tag) === current)
    return index === -1 ? 0 : index
  })()

  const end = (() => {
    if (!previous) return releases.length
    const index = releases.findIndex((release, i) => i >= start && normalizeVersion(release.tag) === previous)
    return index === -1 ? releases.length : index
  })()

  const highlights = releases.slice(start, end).flatMap((release) => release.highlights)
  const seen = new Set<string>()
  const unique = highlights.filter((highlight) => {
    const key = dedupeKey(highlight)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return unique.slice(0, 5)
}

function dedupeKey(highlight: Highlight) {
  return [highlight.title, highlight.description, highlight.media?.type ?? "", highlight.media?.src ?? ""].join("\n")
}

function loadReleaseHighlights(value: unknown, current?: string, previous?: string, platform?: string) {
  const releases = parseChangelog(value, platform ?? "")
  if (!releases?.length) return []
  return sliceHighlights({ releases, current, previous })
}

export const { use: useHighlights, provider: HighlightsProvider } = createSimpleContext({
  name: "Highlights",
  gate: false,
  init: () => {
    const platform = usePlatform()
    const dialog = useDialog()
    const settings = useSettings()
    const [store, setStore, _, ready] = persisted("highlights.v1", createStore<Store>({ version: undefined }))

    const [range, setRange] = createStore({
      from: undefined as string | undefined,
      to: undefined as string | undefined,
    })
    const state = { started: false }
    let timer: ReturnType<typeof setTimeout> | undefined

    const clearTimer = () => {
      if (timer === undefined) return
      clearTimeout(timer)
      timer = undefined
    }

    const markSeen = () => {
      if (!platform.version) return
      setStore("version", platform.version)
    }

    const start = (previous: string) => {
      if (!settings.general.releaseNotes()) {
        markSeen()
        return
      }

      const fetcher = platform.fetch ?? fetch
      const controller = new AbortController()
      onCleanup(() => {
        controller.abort()
        clearTimer()
      })

      fetcher(CHANGELOG_URL, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      })
        .then((response) => (response.ok ? (response.json() as Promise<unknown>) : undefined))
        .then((json) => {
          if (!json) return
          const highlights = loadReleaseHighlights(json, platform.version, previous, platform.platform)
          if (controller.signal.aborted) return

          if (highlights.length === 0) {
            markSeen()
            return
          }

          timer = setTimeout(() => {
            timer = undefined
            markSeen()
            dialog.show(() => <DialogReleaseNotes highlights={highlights} />)
          }, 500)
        })
        .catch(() => undefined)
    }

    createEffect(() => {
      if (state.started) return
      if (!ready()) return
      if (!settings.ready()) return
      if (!platform.version) return
      state.started = true

      const previous = store.version
      if (!previous) {
        setStore("version", platform.version)
        return
      }

      if (previous === platform.version) return

      setRange({ from: previous, to: platform.version })
      start(previous)
    })

    return {
      ready,
      from: () => range.from,
      to: () => range.to,
      get last() {
        return store.version
      },
      markSeen,
    }
  },
})
