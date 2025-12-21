// src/contexts/TranslationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import TranslationService from '../services/TranslationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TranslationContext = createContext();

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};

export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadedModels, setDownloadedModels] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load saved language preference on mount
  useEffect(() => {
    loadLanguagePreference();
    loadDownloadedModels();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        console.log(`📱 Loaded saved language: ${savedLanguage}`);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDownloadedModels = async () => {
    try {
      const models = await TranslationService.getDownloadedModels();
      setDownloadedModels(models);
      console.log('📦 Downloaded models:', models);
    } catch (error) {
      console.error('Error loading downloaded models:', error);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      console.log(`\n🌐 === CHANGING LANGUAGE TO: ${languageCode} ===`);
      setIsTranslating(true);
      
      // Download model if needed
      console.log('📥 Ensuring models are downloaded...');
      const enReady = await TranslationService.downloadModelIfNeeded('en');
      const targetReady = await TranslationService.downloadModelIfNeeded(languageCode);
      
      if (!enReady || !targetReady) {
        console.error(`❌ Model download failed. EN: ${enReady}, Target: ${targetReady}`);
        throw new Error(`Failed to download language models. Please check your internet connection and try again.`);
      }
      
      // Save preference
      await AsyncStorage.setItem('app_language', languageCode);
      
      // Update state
      setCurrentLanguage(languageCode);
      
      // Increment refresh key to force re-translation
      setRefreshKey(prev => prev + 1);
      
      // Refresh downloaded models list
      await loadDownloadedModels();
      
      console.log(`✅ Language changed to: ${languageCode}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error changing language:', error);
      return { success: false, error: error.message };
    } finally {
      setIsTranslating(false);
    }
  };

  const translate = async (text, targetLang = null) => {
    const target = targetLang || currentLanguage;
    if (target === 'en' || !text) {
      return text;
    }
    
    try {
      return await TranslationService.translateText(text, target, 'en');
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const translateFromTo = async (text, fromLang, toLang) => {
    try {
      return await TranslationService.translateText(text, toLang, fromLang);
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const value = {
    currentLanguage,
    setCurrentLanguage: changeLanguage,
    changeLanguage, // ✅ Add this alias
    translate,
    translateText: translate, // ✅ Add this alias
    translateFromTo,
    isLoading,
    isTranslating,
    setIsTranslating,
    downloadedModels,
    refreshModels: loadDownloadedModels,
    refreshKey,
    supportedLanguages: TranslationService.SUPPORTED_LANGUAGES,
    availableLanguages: TranslationService.SUPPORTED_LANGUAGES, // ✅ Add this alias
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export default TranslationContext;