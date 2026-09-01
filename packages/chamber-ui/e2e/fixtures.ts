import { test as base, expect, type Page } from '@playwright/test'
import { createOpencodeClient, type OpencodeClient, type Session } from '@opencode-ai/sdk/v2'

const backendHost = process.env.PLAYWRIGHT_SERVER_HOST?.trim() || 'localhost'
const backendPort = process.env.PLAYWRIGHT_SERVER_PORT?.trim() || '4096'

export const backendUrl = `http://${backendHost}:${backendPort}`
export const scratchDirectory = process.env.CHAMBER_E2E_DIRECTORY?.trim() || '/tmp'

export type SessionOptions = {
  title?: string
  directory?: string
  parentID?: string
}

type TrackedResources = {
  sessions: Map<string, string>
  directories: Set<string>
}

export type WithSession = {
  (input?: string | SessionOptions): Promise<Session>
  <T>(input: string | SessionOptions, callback: (session: Session) => Promise<T>): Promise<T>
}

export type ChamberE2EFixtures = {
  sdk: OpencodeClient
  opencode: OpencodeClient
  withSession: WithSession
  trackSession: (sessionID: string, directory?: string) => void
  trackDirectory: (directory: string) => void
}

const createClient = (): OpencodeClient => createOpencodeClient({ baseUrl: backendUrl })

const sessionDirectory = (session: Session, fallback: string): string => {
  const directory = (session as Session & { directory?: unknown }).directory
  return typeof directory === 'string' && directory.trim() ? directory : fallback
}

const describeSdkError = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

const createSession = async (sdk: OpencodeClient, input: string | SessionOptions = {}): Promise<Session> => {
  const options = typeof input === 'string' ? { title: input } : input
  const directory = options.directory ?? scratchDirectory
  const response = await sdk.session.create({
    directory,
    ...(options.title ? { title: options.title } : {}),
    ...(options.parentID ? { parentID: options.parentID } : {}),
  })
  if (response.error !== undefined || !response.data) {
    throw new Error(`Unable to create e2e session: ${describeSdkError(response.error)}`)
  }
  return response.data
}

const deleteSession = async (sdk: OpencodeClient, sessionID: string, directory: string): Promise<void> => {
  await sdk.session.abort({ sessionID, directory }).catch(() => undefined)
  await sdk.session.delete({ sessionID, directory }).catch(() => undefined)
}

export async function withSession<T>(
  sdk: OpencodeClient,
  title: string,
  callback: (session: Session) => Promise<T>,
  directory = scratchDirectory,
): Promise<T> {
  const session = await createSession(sdk, { title, directory })
  try {
    return await callback(session)
  } finally {
    await deleteSession(sdk, session.id, sessionDirectory(session, directory))
  }
}

const projectIdFromPath = (directory: string): string => {
  const normalized = directory.replace(/\\/g, '/').replace(/\/+$/g, '').trim()
  const bytes = new TextEncoder().encode(normalized)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `path_${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`
}

export const seedMobilePage = async (page: Page, options: { directory?: string; serverUrl?: string } = {}): Promise<void> => {
  const directory = options.directory ?? scratchDirectory
  const serverUrl = options.serverUrl ?? backendUrl
  const projectID = projectIdFromPath(directory)

  await page.addInitScript(
    ({ directory: seededDirectory, serverUrl: seededServerUrl, projectID: seededProjectID }) => {
      localStorage.setItem('opencode.settings.dat:defaultServerUrl', seededServerUrl)
      localStorage.setItem('lastDirectory', seededDirectory)
      localStorage.setItem('homeDirectory', '/tmp')
      localStorage.setItem(
        `projects:${encodeURIComponent(seededServerUrl)}`,
        JSON.stringify([{ path: seededDirectory, label: 'Chamber UI e2e', addedAt: Date.now(), lastOpenedAt: Date.now() }]),
      )
      localStorage.setItem(`activeProjectId:${encodeURIComponent(seededServerUrl)}`, seededProjectID)
    },
    { directory, serverUrl, projectID },
  )
}

export const test = base.extend<ChamberE2EFixtures & { resources: TrackedResources }>({
  resources: [
    async ({}, use) => {
      const resources: TrackedResources = { sessions: new Map(), directories: new Set() }
      await use(resources)
      const sdk = createClient()
      await Promise.allSettled(
        Array.from(resources.sessions, ([sessionID, directory]) => deleteSession(sdk, sessionID, directory)),
      )
      resources.sessions.clear()
      resources.directories.clear()
    },
    { auto: true },
  ],
  sdk: async ({}, use) => {
    await use(createClient())
  },
  opencode: async ({ sdk }, use) => {
    await use(sdk)
  },
  trackSession: async ({ resources }, use) => {
    await use((sessionID, directory = scratchDirectory) => {
      resources.sessions.set(sessionID, directory)
    })
  },
  trackDirectory: async ({ resources }, use) => {
    await use((directory) => {
      resources.directories.add(directory)
    })
  },
  withSession: async ({ sdk, trackSession, trackDirectory }, use) => {
    const helper = (async <T>(
      input: string | SessionOptions = {},
      callback?: (session: Session) => Promise<T>,
    ): Promise<Session | T> => {
      const session = await createSession(sdk, input)
      const directory = sessionDirectory(session, typeof input === 'string' ? scratchDirectory : input.directory ?? scratchDirectory)
      trackDirectory(directory)
      trackSession(session.id, directory)
      if (callback) return callback(session)
      return session
    }) as WithSession
    await use(helper)
  },
})

export { expect }
