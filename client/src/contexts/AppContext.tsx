import { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { settingsApi } from '../api/settings';
import type { StageConfigData } from '../api/settings';
import { filterEnabledStages } from '../utils/constants';

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

  const value = useMemo<AppContextValue>(
    () => ({
      schoolSettings,
      stages,
      enabledStages,
      user,
      loading,
      refresh: fetchData,
    }),
    [schoolSettings, stages, enabledStages, user, loading, fetchData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
