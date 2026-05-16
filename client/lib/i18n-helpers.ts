/**
 * i18n Helper Utilities
 * Quick utilities to apply translations to components
 */

import React from "react";
import { useTranslate } from "@/hooks/_stubs/useTranslate";
import { useLocalization } from "@/hooks/_stubs/useLocalization";

/**
 * Higher-order component to auto-translate component props
 */
export function withTranslation<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  translationKeys: Record<keyof P, string>
) {
  return function TranslatedComponent(props: P) {
    const { translate } = useTranslate();
    const [translatedProps, setTranslatedProps] = React.useState<P>(props);

    React.useEffect(() => {
      async function translateProps() {
        const keys = Object.keys(translationKeys) as Array<keyof P>;
        const translations = await Promise.all(
          keys.map(async (key) => {
            if (typeof props[key] === "string") {
              return [key, await translate(props[key] as string)];
            }
            return [key, props[key]];
          })
        );
        setTranslatedProps(
          Object.fromEntries(translations) as P
        );
      }
      translateProps();
    }, [props, translate]);

    return React.createElement(Component, translatedProps);
  };
}

/**
 * Hook to auto-translate object values
 */
export function useAutoTranslate<T extends Record<string, any>>(
  obj: T
): T {
  const { translate } = useTranslate();
  const [translated, setTranslated] = React.useState<T>(obj);

  React.useEffect(() => {
    async function translateObj() {
      const entries = Object.entries(obj);
      const translatedEntries = await Promise.all(
        entries.map(async ([key, value]) => {
          if (typeof value === "string") {
            return [key, await translate(value)];
          }
          return [key, value];
        })
      );
      setTranslated(Object.fromEntries(translatedEntries) as T);
    }
    translateObj();
  }, [obj, translate]);

  return translated;
}

/**
 * RTL-aware component wrapper
 */
export function withRTLSupport<P extends Record<string, any>>(
  Component: React.ComponentType<P>
) {
  return function RTLComponent(props: P) {
    const { isRTL } = useLocalization();
    const className = `${props.className || ""} ${isRTL ? "rtl" : "ltr"}`.trim();

    return React.createElement(
      "div",
      { dir: isRTL ? "rtl" : "ltr", className },
      React.createElement(Component, props),
    );
  };
}

/**
 * Format number with regional formatting
 */
export function useFormatNumber() {
  const { numberFormat } = useLocalization();
  return (value: number) => numberFormat.format(value);
}

/**
 * Format currency with regional formatting
 */
export function useFormatCurrency() {
  const { currencyFormat } = useLocalization();
  return (value: number) => currencyFormat.format(value);
}

/**
 * Format date with regional formatting
 */
export function useFormatDate() {
  const { dateFormat } = useLocalization();
  return (date: Date) => dateFormat.format(date);
}
