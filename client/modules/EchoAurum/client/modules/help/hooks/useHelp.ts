import { useState, useCallback } from "react";
import type { HelpCategory } from "@/shared/help";
interface HelpState {
  helpOpen: boolean;
  onboardingOpen: boolean;
  helpCategory?: HelpCategory;
  helpArticleId?: string;
  onboardingModuleId?: string;
}
export function useHelp() {
  const [state, setState] = useState<HelpState>({
    helpOpen: false,
    onboardingOpen: false,
  });
  const openHelp = useCallback(
    (category?: HelpCategory, articleId?: string) => {
      setState((prev) => ({
        ...prev,
        helpOpen: true,
        helpCategory: category,
        helpArticleId: articleId,
      }));
    },
    [],
  );
  const closeHelp = useCallback(() => {
    setState((prev) => ({ ...prev, helpOpen: false }));
  }, []);
  const openOnboarding = useCallback((moduleId?: string) => {
    setState((prev) => ({
      ...prev,
      onboardingOpen: true,
      onboardingModuleId: moduleId,
    }));
  }, []);
  const closeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, onboardingOpen: false }));
  }, []);
  const openHelpArticle = useCallback(
    (articleId: string) => {
      openHelp(undefined, articleId);
    },
    [openHelp],
  );
  return {
    ...state,
    openHelp,
    closeHelp,
    openOnboarding,
    closeOnboarding,
    openHelpArticle,
  };
}
