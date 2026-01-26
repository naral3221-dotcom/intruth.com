import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useSettingsStore,
  type AppearanceSettings,
  type SecuritySettings,
} from '@/stores/settingsStore';

export type { AppearanceSettings, SecuritySettings };

export interface UserSettings {
  appearance: AppearanceSettings;
  security: SecuritySettings;
}

interface UseSettingsReturn {
  settings: UserSettings;
  loading: boolean;
  updateAppearance: (updates: Partial<AppearanceSettings>) => void;
  updateSecurity: (updates: Partial<SecuritySettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  profile: {
    name: string;
    email: string;
    avatarUrl?: string;
    department?: string;
    position?: string;
  } | null;
  updateProfile: (updates: { name?: string; avatarUrl?: string }) => void;
}

export function useSettings(): UseSettingsReturn {
  const { user, setUser } = useAuthStore();
  const {
    appearance,
    security,
    updateAppearance: storeUpdateAppearance,
    updateSecurity: storeUpdateSecurity,
    resetSettings: storeResetSettings,
  } = useSettingsStore();

  const settings: UserSettings = {
    appearance,
    security,
  };

  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.appearance) {
        storeUpdateAppearance(parsed.appearance);
      }
      if (parsed.security) {
        storeUpdateSecurity(parsed.security);
      }
      return true;
    } catch {
      return false;
    }
  }, [storeUpdateAppearance, storeUpdateSecurity]);

  const updateProfile = useCallback((updates: { name?: string; avatarUrl?: string }) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...updates,
      };
      setUser(updatedUser);
    }
  }, [user, setUser]);

  const profile = user
    ? {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        department: user.department,
        position: user.position,
      }
    : null;

  return {
    settings,
    loading: false, // Store is synchronous after hydration
    updateAppearance: storeUpdateAppearance,
    updateSecurity: storeUpdateSecurity,
    resetSettings: storeResetSettings,
    exportSettings,
    importSettings,
    profile,
    updateProfile,
  };
}
