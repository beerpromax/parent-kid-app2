import React, { createContext, useContext, useState, useEffect } from 'react';
import { useProfile } from './ProfileContext';
import { subscribeActivities } from '../../lib/repos/activities.repo';
import { subscribeCompletions } from '../../lib/repos/completions.repo';
import { subscribeLedger } from '../../lib/repos/ledger.repo';
import { Activity, Completion, LedgerEntry } from '../../lib/types';

interface DataContextType {
  activities: Activity[];
  completions: Completion[];
  ledger: LedgerEntry[];
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { familyId, currentProfile } = useProfile();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !currentProfile) {
      setActivities([]);
      setCompletions([]);
      setLedger([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubActivities: (() => void) | undefined;
    let unsubCompletions: (() => void) | undefined;
    let unsubLedger: (() => void) | undefined;

    let activitiesLoaded = false;
    let completionsLoaded = false;
    let ledgerLoaded = false;

    const checkLoaded = () => {
      const isParent = currentProfile.role === 'parent';
      if (activitiesLoaded && completionsLoaded && (isParent || ledgerLoaded)) {
        setLoading(false);
      }
    };

    // 1. Subscribe to Activities
    unsubActivities = subscribeActivities(familyId, (acts) => {
      setActivities(acts);
      activitiesLoaded = true;
      checkLoaded();
    });

    // 2. Subscribe to Completions
    const compOpts = currentProfile.role === 'parent' ? {} : { kidId: currentProfile.id };
    unsubCompletions = subscribeCompletions(familyId, compOpts, (comps) => {
      setCompletions(comps);
      completionsLoaded = true;
      checkLoaded();
    });

    // 3. Subscribe to Ledger
    if (currentProfile.role === 'kid') {
      unsubLedger = subscribeLedger(familyId, currentProfile.id, (entries) => {
        setLedger(entries);
        ledgerLoaded = true;
        checkLoaded();
      });
    } else {
      setLedger([]);
      ledgerLoaded = true;
      checkLoaded();
    }

    return () => {
      if (unsubActivities) unsubActivities();
      if (unsubCompletions) unsubCompletions();
      if (unsubLedger) unsubLedger();
    };
  }, [familyId, currentProfile]);

  return (
    <DataContext.Provider
      value={{
        activities,
        completions,
        ledger,
        loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
