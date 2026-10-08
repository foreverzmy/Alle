import { create } from 'zustand';
import zh from '../../../public/locales/zh.json';
import en from '../../../public/locales/en.json';

type Translations = Record<string, string>;

interface I18nState {
    translations: Record<string, Translations>;
    currentLocale: string;
    isLoading: boolean;
    loadTranslations: (locale: string) => Promise<Translations>;
    getCurrentTranslations: () => Translations;
}

// Ship dictionaries with the fingerprinted JavaScript bundle. Separate locale
// requests can otherwise pair a new UI with an older Service Worker cache.
const useI18nStore = create<I18nState>((set, get) => ({
    translations: { zh, en },
    currentLocale: 'zh',
    isLoading: false,
    loadTranslations: async (locale) => {
        const currentLocale = locale === 'en' ? 'en' : 'zh';
        if (get().currentLocale !== currentLocale) set({ currentLocale });
        return get().translations[currentLocale];
    },
    getCurrentTranslations: () => get().translations[get().currentLocale] || zh,
}));

export default useI18nStore;
