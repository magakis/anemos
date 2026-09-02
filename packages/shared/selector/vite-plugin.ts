export const createSelectorConfigPlugin = (enabled: boolean) => ({
  name: "anemos-selector-config",
  generateBundle(this: { emitFile: (item: { type: "asset"; fileName: string; source: string }) => void }) {
    this.emitFile({
      type: "asset",
      fileName: "selector-config.json",
      source: JSON.stringify({ enabled }),
    })
    this.emitFile({ type: "asset", fileName: "assets/selector/.keep", source: "" })
  },
})
