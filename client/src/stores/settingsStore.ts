import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

export interface AppearanceSettings {
  theme: Theme;
  compactMode: boolean;
  animationsEnabled: boolean;
  particleEffects: boolean; // Deprecated but kept for compatibility
}

export interface SecuritySettings {
  sessionTimeout: number; // minutes
}

export interface SettingsState {
  appearance: AppearanceSettings;
  security: SecuritySettings;

  // Computed
  effectiveTheme: 'dark' | 'light';

  // Actions
  updateAppearance: (updates: Partial<AppearanceSettings>) => void;
  updateSecurity: (updates: Partial<SecuritySettings>) => void;
  resetSettings: () => void;
  initializeTheme: () => void;
}

const defaultAppearance: AppearanceSettings = {
  theme: 'light', // Changed to light as default
  compactMode: false,
  animationsEnabled: true,
  particleEffects: false, // Disabled by default (deprecated feature)
};

const defaultSecurity: SecuritySettings = {
  sessionTimeout: 60,
};

// Helper to get system theme
const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// Apply theme to document
const applyTheme = (theme: 'dark' | 'light') => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }
};

// Apply animations setting
const applyAnimations = (enabled: boolean) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(
      '--animation-duration',
      enabled ? '1' : '0'
    );
    document.documentElement.classList.toggle('reduce-motion', !enabled);
  }
};

// Apply compact mode
const applyCompactMode = (enabled: boolean) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('compact-mode', enabled);
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      appearance: defaultAppearance,
      security: defaultSecurity,
      effectiveTheme: 'light',

      initializeTheme: () => {
        const { appearance } = get();
        const effectiveTheme = appearance.theme === 'system'
          ? getSystemTheme()
          : appearance.theme;

        applyTheme(effectiveTheme);
        applyAnimations(appearance.animationsEnabled);
        applyCompactMode(appearance.compactMode);

        set({ effectiveTheme });

        // Listen for system theme changes
        if (typeof window !== 'undefined' && window.matchMedia) {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          mediaQuery.addEventListener('change', (e) => {
            const { appearance } = get();
            if (appearance.theme === 'system') {
              const newTheme = e.matches ? 'dark' : 'light';
              applyTheme(newTheme);
              set({ effectiveTheme: newTheme });
            }
          });
        }
      },

      updateAppearance: (updates) =>
        set((state) => {
          const newAppearance = { ...state.appearance, ...updates };

          // Apply theme changes
          if (updates.theme !== undefined) {
            const effectiveTheme = updates.theme === 'system'
              ? getSystemTheme()
              : updates.theme;
            applyTheme(effectiveTheme);
            return {
              appearance: newAppearance,
              effectiveTheme,
            };
          }

          // Apply animation changes
          if (updates.animationsEnabled !== undefined) {
            applyAnimations(updates.animationsEnabled);
          }

          // Apply compact mode changes
          if (updates.compactMode !== undefined) {
            applyCompactMode(updates.compactMode);
          }

          return { appearance: newAppearance };
        }),

      updateSecurity: (updates) =>
        set((state) => ({
          security: { ...state.security, ...updates },
        })),

      resetSettings: () => {
        applyTheme('light');
        applyAnimations(true);
        applyCompactMode(false);
        set({
          appearance: defaultAppearance,
          security: defaultSecurity,
          effectiveTheme: 'light',
        });
      },
    }),
    {
      name: 'intruth-settings',
      partialize: (state) => ({
        appearance: state.appearance,
        security: state.security,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply settings after rehydration
        if (state) {
          state.initializeTheme();
        }
      },
    }
  )
);
