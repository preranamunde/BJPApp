import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import SplashScreen from 'react-native-splash-screen';

import StaticBannerSplash from './src/components/StaticBannerSplash';
import LogoSplash from './src/components/LogoSplash';
import YouTubeSplash from './src/components/YouTubeSplash';
import AppNavigator from './src/navigation/AppNavigator'



const App = () => {
  const [stage, setStage] = useState('static');
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    SplashScreen.hide(); // hide native splash screen
  }, []);

  // Render splash stages in order
  if (stage === 'static') {
    return <StaticBannerSplash onComplete={() => setStage('logo')} />;
  }

  if (stage === 'logo') {
    return <LogoSplash onComplete={() => setStage('youtube')} />;
  }

  if (stage === 'youtube') {
    return <YouTubeSplash onComplete={() => bootstrapFlow()} />;
  }

  return (
    <NavigationContainer>
      <AppNavigator/>
    </NavigationContainer>
  );
};

export default App;