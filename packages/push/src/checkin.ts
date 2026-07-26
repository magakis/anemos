import { checkin as send } from "./relay.js"
import { load, save, withStateLock, type Data, type Relay } from "./state.js"

const COOL_MS = 30_000

function same(a?: Relay, b?: Relay) {
  if (!a || !b) return false
  return a.url === b.url && a.channel === b.channel && a.secret === b.secret
}

function age(value?: number) {
  if (!value) return
  return Date.now() - value
}

async function fresh(relay?: Relay) {
  if (!relay?.checked) return
  const next = age(relay.checked)
  if (next === undefined || next >= COOL_MS) return
  return next
}

export async function checkin(data: Data, _source: string) {
  const relay = data.relay
  if (data.mode !== "relay" || !relay) {
    return {
      status: "skip" as const,
      reason: "not_relay",
    }
  }

  const current = await load()
  const seen = same(current.relay, relay) ? current.relay : relay
  const recent = await fresh(seen)
  if (recent !== undefined) {
    return {
      status: "skip" as const,
      reason: "fresh",
    }
  }

  try {
    await send(data)
    const ok = {
      ...relay,
      checked: Date.now(),
      result: "ok" as const,
      reason: undefined,
      err: undefined,
    }
    await withStateLock(async () => {
      const latest = await load()
      latest.relay = ok
      await save(latest)
    })
    data.relay = ok
    return {
      status: "ok" as const,
    }
  } catch (err) {
    const fail = {
      ...relay,
      checked: Date.now(),
      result: "failed" as const,
      err: err instanceof Error ? err.message : String(err),
    }
    await withStateLock(async () => {
      const latest = await load()
      latest.relay = fail
      await save(latest)
    })
    data.relay = fail
    return {
      status: "err" as const,
      reason: fail.err,
    }
  }
}
