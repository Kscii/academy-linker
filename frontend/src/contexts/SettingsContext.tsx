import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type ThemeMode = "light" | "dark"

export type AiStylePreference = "concise" | "detailed" | "encouraging"

export type Settings = {
  theme: ThemeMode
  highContrast: boolean
  ttsEnabled: boolean
  language: "zh-CN" | "en"
  aiStyle: AiStylePreference
  aiHistoryArchive: boolean
  emailDigestEnabled: boolean
  emailPostsEnabled: boolean
}

type SettingsContextValue = {
  settings: Settings
  setSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

const STORAGE_KEY = "academy-linker:settings"

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  highContrast: false,
  ttsEnabled: false,
  language: "zh-CN",
  aiStyle: "encouraging",
  aiHistoryArchive: true,
  emailDigestEnabled: true,
  emailPostsEnabled: true,
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  const night = theme === "dark"
  root.classList.toggle("dark", night)
  root.setAttribute("data-theme", night ? "night" : "day")
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings())

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setSettings,
    }),
    [settings, setSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}

