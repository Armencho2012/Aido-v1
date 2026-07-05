import { useSettings } from './useSettings';

export const useTranslation = () => {
    const { t, language, setLanguage } = useSettings();
    return { t, language, setLanguage };
};
