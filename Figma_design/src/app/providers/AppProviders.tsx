import React from 'react';
import { ProfileProvider } from '../context/ProfileContext';
import { DataProvider } from '../context/DataContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProfileProvider>
      <DataProvider>
        {children}
      </DataProvider>
    </ProfileProvider>
  );
};
