import { describe, expect, test } from "bun:test"
import { type Accessor } from "solid-js"
import type { ContextItem, Prompt } from "@/context/prompt"
import { createPromptSubmissionState } from "./submission-state"

const emptyPrompt: Prompt = [{ type: "text", content: "", start: 0, end: 0 }]
const testPrompt: Prompt = [{ type: "text", content: "hello world", start: 0, end: 11 }]
const testContext: (ContextItem & { key: string })[] = [
  { key: "file:src/a.ts::", type: "file", path: "src/a.ts" },
]

function createReady(): Accessor<boolean> & { promise: Promise<any> | undefined } {
  const accessor = () => true as boolean
  accessor.promise = undefined
  return accessor as Accessor<boolean> & { promise: Promise<any> | undefined }
}

function createMockTarget() {
  let current = emptyPrompt
  const items: (ContextItem & { key: string })[] = []

  return {
    current: () => current,
    reset: () => {
      current = emptyPrompt
    },
    context: {
      add: (item: ContextItem) => {
        items.push({ ...item, key: item.path ?? "unknown" })
      },
      items: () => items,
      remove: (_key: string) => {},
      removeComment: (_path: string, _id: string) => {},
      updateComment: (_path: string, _id: string, _next: Partial<ContextItem> & { comment?: string }) => {},
      replaceComments: (_items: ContextItem[]) => {},
    },
    set: (_prompt: Prompt, _cursorPosition?: number) => {},
    cursor: () => undefined,
    dirty: () => false,
    ready: createReady,
  }
}

describe("prompt-input submission-state", () => {
  test("captures initial state", () => {
    const target = createMockTarget()
    const state = createPromptSubmissionState({
      target,
      prompt: testPrompt,
      context: testContext,
    })

    expect(state.prompt).toBe(testPrompt)
    expect(state.context).toBe(testContext)
    expect(state.target()).toBe(target)
  })

  test("clear resets target and remembers cleared state", () => {
    const target = createMockTarget()
    const state = createPromptSubmissionState({
      target,
      prompt: testPrompt,
      context: testContext,
    })

    state.clear()
    expect(target.current()).toEqual(emptyPrompt)
  })

  test("restore returns captured state when prompt has not changed after clear", () => {
    const target = createMockTarget()
    const state = createPromptSubmissionState({
      target,
      prompt: testPrompt,
      context: testContext,
    })

    state.clear()
    const restored = state.restore()
    expect(restored).toBeDefined()
    expect(restored!.prompt).toBe(testPrompt)
    expect(restored!.context).toBe(testContext)
    expect(restored!.target).toBe(target)
  })

  test("restore returns undefined when prompt was modified after clear", () => {
    const target = createMockTarget()
    const state = createPromptSubmissionState({
      target,
      prompt: testPrompt,
      context: testContext,
    })

    state.clear()
    // Simulate user editing after clear
    ;(target as any)["current"] = () => [
      { type: "text", content: "new text", start: 0, end: 8 },
    ]

    expect(state.restore()).toBeUndefined()
  })

  test("retarget switches to a new target and adds context items", () => {
    const target1 = createMockTarget()
    const state = createPromptSubmissionState({
      target: target1,
      prompt: testPrompt,
      context: testContext,
    })

    const target2 = createMockTarget()
    state.retarget(target2)

    expect(state.target()).toBe(target2)
    // Context items from input were added to the new target
    expect(target2.context.items()).toHaveLength(1)
    expect(target2.context.items()[0]!.path).toBe("src/a.ts")
  })

  test("current checks if a target is the active one", () => {
    const target1 = createMockTarget()
    const target2 = createMockTarget()
    const state = createPromptSubmissionState({
      target: target1,
      prompt: testPrompt,
      context: [],
    })

    expect(state.current(target1)).toBe(true)
    expect(state.current(target2)).toBe(false)
  })

  test("restore returns captured state when clear was never called", () => {
    const target = createMockTarget()
    const state = createPromptSubmissionState({
      target,
      prompt: testPrompt,
      context: testContext,
    })

    const restored = state.restore()
    expect(restored).toBeDefined()
    expect(restored!.prompt).toBe(testPrompt)
    expect(restored!.context).toBe(testContext)
  })
})
