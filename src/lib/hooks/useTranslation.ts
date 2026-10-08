import useI18nStore from '@/lib/store/i18n';

import { useSettingsStore } from '@/lib/store/settings';
import { useCallback, useEffect } from 'react';

export default function useTranslation() {
    const { language } = useSettingsStore();
    const { loadTranslations, translations, isLoading } = useI18nStore();
    const currentTranslations = translations[language];

    // 监听语言变化，自动加载对应翻译
    useEffect(() => {
        void loadTranslations(language);
    }, [language, loadTranslations]);

    // 翻译函数 - 支持变量插值
    const translate = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            let text = currentTranslations?.[key] || key;

            if (params) {
                Object.keys(params).forEach((param) => {
                    text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
                });
            }

            return text;
        },
        [currentTranslations]
    );

    return { t: translate, language, isLoading };
};

