import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';

// Initialize global fetch interceptor for automatic token refresh
import './src/services/globalFetchInterceptor';

export default function App() {
  return <AppNavigator />;
}
