import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { DataProvider } from '../context/DataContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ProfileProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </ProfileProvider>
    </AuthProvider>
  );
};
