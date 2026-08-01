import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createPromptInputTransientState, type PromptInputTransientState } from "./transient-state"

describe("prompt-input transient-state", () => {
  test("creates store with default values", () => {
    createRoot(() => {
      const [store] = createPromptInputTransientState(() => "session-1", 5)

      expect(store.popover).toBeNull()
      expect(store.historyIndex).toBe(-1)
      expect(store.savedPrompt).toBeNull()
      expect(store.placeholder).toBe(5)
      expect(store.draggingType).toBeNull()
      expect(store.mode).toBe("normal")
      expect(store.applyingHistory).toBe(false)
    })
  })

  test("setStore updates individual fields", () => {
    createRoot(() => {
      const [store, setStore] = createPromptInputTransientState(() => "session-1", 3)

      expect(store.mode).toBe("normal")
      setStore("mode", "shell")
      expect(store.mode).toBe("shell")

      setStore("popover", "at")
      expect(store.popover).toBe("at")

      setStore("historyIndex", 2)
      expect(store.historyIndex).toBe(2)
    })
  })

  test("identity change resets state to defaults", () => {
    let id = "session-1"
    createRoot(() => {
      const [store, setStore] = createPromptInputTransientState(() => id, 7)

      setStore("mode", "shell")
      setStore("historyIndex", 5)
      setStore("popover", "slash")
      expect(store.mode).toBe("shell")

      id = "session-2"
      // Trigger the reactive computation; after microtask the reset fires
      return () => {
        expect(store.mode).toBe("normal")
        expect(store.popover).toBeNull()
        expect(store.historyIndex).toBe(-1)
        expect(store.applyingHistory).toBe(false)
        expect(store.placeholder).toBe(7)
      }
    })
  })

  test("placeholder survives reset", () => {
    let id = "session-1"
    createRoot(() => {
      const [store] = createPromptInputTransientState(() => id, 42)
      expect(store.placeholder).toBe(42)

      id = "session-2"
      return () => {
        expect(store.placeholder).toBe(42)
      }
    })
  })
})
