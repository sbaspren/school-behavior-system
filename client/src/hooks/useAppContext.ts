import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import type { AppContextValue } from '../contexts/AppContext';

/**
 * Access the centralized app context (settings, stages, user).
 * Must be used inside an <AppProvider>.
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
