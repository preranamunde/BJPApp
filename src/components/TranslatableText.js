// src/components/TranslatableText.js
import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { useTranslation } from '../context/TranslationContext';

const TranslatableText = ({ children, style, cacheKey, ...props }) => {
  const { translate, currentLanguage, refreshKey } = useTranslation();
  const [translated, setTranslated] = useState(children);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const doTranslation = async () => {
      // If English or no text, just show original
      if (currentLanguage === 'en' || !children || typeof children !== 'string') {
        setTranslated(children);
        return;
      }

      setIsTranslating(true);
      
      try {
        const result = await translate(children);
        if (isMounted) {
          setTranslated(result);
        }
      } catch (error) {
        console.error('Translation error in component:', error);
        if (isMounted) {
          setTranslated(children); // Fallback to original
        }
      } finally {
        if (isMounted) {
          setIsTranslating(false);
        }
      }
    };

    doTranslation();

    return () => {
      isMounted = false;
    };
  }, [children, currentLanguage, refreshKey]);

  return (
    <Text style={style} {...props}>
      {translated}
    </Text>
  );
};

export default TranslatableText;