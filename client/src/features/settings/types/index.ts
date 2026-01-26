import type { LucideIcon } from "lucide-react";

export type TabId = "profile" | "appearance" | "security";

export interface Tab {
    id: TabId;
    label: string;
    icon: LucideIcon;
}

// Re-export settings types from hooks
export type {
    AppearanceSettings,
    SecuritySettings,
    UserSettings,
} from '../hooks/useSettings';
