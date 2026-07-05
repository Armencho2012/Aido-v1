import { useSettingsContext } from "@/components/SettingsProvider";
import { Language, Theme } from "@/lib/settings";

export function useSettings() {
  const context = useSettingsContext();
  return {
    ...context,
    isLoaded: true,
  };
}

export type { Language, Theme };
