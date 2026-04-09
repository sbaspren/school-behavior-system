import { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { settingsApi } from '../api/settings';
import type { StageConfigData } from '../api/settings';
import { filterEnabledStages } from '../utils/constants';

/* ── Resolve which stage should be active on load ── */
function resolveActiveStage(enabledStages: StageConfigData[], user: AppUser | null): string {
  // Deputy: locked to their scopeValue
  if (user?.role !== 'Admin' && user?.scopeType === 'stage' && user?.scopeValue) {
    return user.scopeValue;
  }
  // Check localStorage for saved preference
  const saved = localStorage.getItem('selectedStage');
  if (saved && enabledStages.some(s => s.stage === saved)) {
    return saved;
  }
  // Default: first enabled stage (lowest order)
  return enabledStages[0]?.stage || '';
}

/* ── User shape (mirrors AuthUser from LoginPage) ── */
export interface AppUser {
  id: number;
  name: string;
  role: string;
  mobile?: string;
  scopeType?: string;
  scopeValue?: string;
}

/* ── Context value ── */
export interface AppContextValue {
  /** Raw school settings as key-value pairs */
  schoolSettings: Record<string, string>;
  /** All stage configurations returned from the server */
  stages: StageConfigData[];
  /** Only stages where isEnabled === true */
  enabledStages: StageConfigData[];
  /** Currently selected stage ID (e.g., 'Primary', 'Intermediate') */
  activeStage: string;
  /** Change the active stage */
  setActiveStage: (stageId: string) => void;
  /** Whether stage tabs should be shown (Admin + 2+ stages) */
  showStageTabs: boolean;
  /** Current logged-in user (read from localStorage) */
  user: AppUser | null;
  /** True while the initial fetch is in progress */
  loading: boolean;
  /** Force a re-fetch of settings + stages */
  refresh: () => Promise<void>;
}

/* ── The context itself (undefined default — guarded by the hook) ── */
export const AppContext = createContext<AppContextValue | undefined>(undefined);

/* ── Provider ── */
interface ProviderProps {
  children: ReactNode;
}

function readUserFromStorage(): AppUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: ProviderProps) {
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<StageConfigData[]>([]);
  const [user] = useState<AppUser | null>(readUserFromStorage);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, structureRes] = await Promise.all([
        settingsApi.getSettings().catch(() => null),
        settingsApi.getStructure().catch(() => null),
      ]);

      // Settings come back as an object with typed fields — flatten to Record<string,string>
      if (settingsRes?.data?.data) {
        const raw = settingsRes.data.data;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (v !== null && v !== undefined) {
            flat[k] = String(v);
          }
        }
        setSchoolSettings(flat);
      }

      // Stages (from getStructure — richer data with grades/classCount)
      if (structureRes?.data?.data?.stages && Array.isArray(structureRes.data.data.stages)) {
        setStages(structureRes.data.data.stages as StageConfigData[]);
      }
    } catch {
      // silent — settings may not be configured yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const enabledStages = useMemo(
    () => filterEnabledStages(stages),
    [stages],
  );

  // ── Active stage management ──
  // Initialize synchronously from localStorage to avoid flash of unfiltered data
  const [activeStage, setActiveStageRaw] = useState(() => {
    if (user?.role !== 'Admin' && user?.scopeType === 'stage' && user?.scopeValue) {
      return user.scopeValue;
    }
    return localStorage.getItem('selectedStage') || '';
  });

  const setActiveStage = useCallback((stageId: string) => {
    setActiveStageRaw(stageId);
    localStorage.setItem('selectedStage', stageId);
  }, []);

  // Validate active stage once enabledStages are loaded (in case saved stage was disabled)
  useEffect(() => {
    if (enabledStages.length > 0) {
      if (!activeStage || !enabledStages.some(s => s.stage === activeStage)) {
        setActiveStageRaw(resolveActiveStage(enabledStages, user));
      }
    }
  }, [enabledStages, user, activeStage]);

  const showStageTabs = useMemo(
    () => user?.role === 'Admin' && enabledStages.length > 1,
    [user, enabledStages],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      schoolSettings,
      stages,
      enabledStages,
      activeStage,
      setActiveStage,
      showStageTabs,
      user,
      loading,
      refresh: fetchData,
    }),
    [schoolSettings, stages, enabledStages, activeStage, setActiveStage, showStageTabs, user, loading, fetchData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
