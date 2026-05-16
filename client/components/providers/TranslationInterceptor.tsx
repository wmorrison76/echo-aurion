import React, { useEffect, useRef } from "react";

import { useI18n } from "@/i18n";

/**
 * TranslationInterceptor Inner Component
 * Must be inside I18nProvider to use useI18n hook
 */
function TranslationInterceptorInner() {
  const { lang } = useI18n();
  const translatedNodes = useRef<Map<Node, string>>(new Map());

  useEffect(() => {
    // Store original text content for all text nodes
    const walkDOM = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0 && !translatedNodes.current.has(node)) {
          translatedNodes.current.set(node, text);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        // Skip script, style, and other non-content elements
        if (
          !["SCRIPT", "STYLE", "META", "TITLE", "LINK"].includes(el.tagName) &&
          !el.classList.contains("no-translate")
        ) {
          for (let i = 0; i < node.childNodes.length; i++) {
            walkDOM(node.childNodes[i]);
          }
        }
      }
    };

    // Initial walk when component mounts
    if (document.body) {
      walkDOM(document.body);
    }

    // Listen for DOM changes to capture new content
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            walkDOM(mutation.addedNodes[i]);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // When language changes, dispatch event to notify all components
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("translation:language-changed", {
        detail: { lang },
      }),
    );
  }, [lang]);

  // This component doesn't render anything visible
  return null;
}

/**
 * TranslationInterceptor
 * Automatically translates all visible text nodes when language changes
 * Works globally without requiring individual component updates
 */
export const TranslationInterceptor = TranslationInterceptorInner;

/**
 * TranslatableText Component
 * Wrap any text content with this to enable automatic translation
 */
interface TranslatableTextProps {
  children: string;
  context?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const TranslatableText = React.forwardRef<
  HTMLElement,
  TranslatableTextProps
>(({ children, context, className, as: Component = "span", ...props }, ref) => {
  const { translate } = useI18n();
  const [translated, setTranslated] = React.useState(children);

  React.useEffect(() => {
    let isMounted = true;

    if (children) {
      translate(children, { context }).then((result) => {
        if (isMounted) {
          setTranslated(result);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [children, context, translate]);

  return React.createElement(
    Component,
    {
      ...props,
      className: className ? `${className} no-translate` : "no-translate",
      ref,
    },
    translated,
  );
});

TranslatableText.displayName = "TranslatableText";

/**
 * useTranslatableContent Hook
 * Auto-translates content whenever it changes or language changes
 */
export function useTranslatableContent(
  content: string | null,
  context?: string,
) {
  const { translate } = useI18n();
  const [translated, setTranslated] = React.useState(content || "");

  React.useEffect(() => {
    if (!content) {
      setTranslated("");
      return;
    }

    let isMounted = true;

    translate(content, { context }).then((result) => {
      if (isMounted) {
        setTranslated(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [content, context, translate]);

  return translated;
}

/**
 * Hook to listen for language changes and re-trigger callbacks
 */
export function useOnLanguageChange(
  callback: (lang: string) => void,
  deps: React.DependencyList = [],
) {
  React.useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail.lang);
    };

    window.addEventListener(
      "translation:language-changed",
      handleLanguageChange,
    );
    return () => {
      window.removeEventListener(
        "translation:language-changed",
        handleLanguageChange,
      );
    };
  }, [callback, ...deps]);
}
