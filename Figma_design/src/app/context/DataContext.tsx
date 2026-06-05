import React, { createContext, useContext, useState, useEffect } from 'react';
import { useProfile } from './ProfileContext';
import { subscribeActivities } from '../../lib/repos/activities.repo';
import { subscribeCompletions } from '../../lib/repos/completions.repo';
import { subscribeLedger } from '../../lib/repos/ledger.repo';
import { subscribeRewards } from '../../lib/repos/rewards.repo';
import { subscribeRedemptions } from '../../lib/repos/redemptions.repo';
import { subscribeNegotiations } from '../../lib/repos/negotiations.repo';
import { Activity, Completion, LedgerEntry, Reward, RedemptionRecord, NegotiationThread } from '../../lib/types';

interface DataContextType {
  activities: Activity[];
  completions: Completion[];
  ledger: LedgerEntry[];
  rewards: Reward[];
  redemptions: RedemptionRecord[];
  negotiations: NegotiationThread[];
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { familyId, currentProfile } = useProfile();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !currentProfile) {
      setActivities([]);
      setCompletions([]);
      setLedger([]);
      setRewards([]);
      setRedemptions([]);
      setNegotiations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubActivities: (() => void) | undefined;
    let unsubCompletions: (() => void) | undefined;
    let unsubLedger: (() => void) | undefined;
    let unsubRewards: (() => void) | undefined;
    let unsubRedemptions: (() => void) | undefined;
    let unsubNegotiations: (() => void) | undefined;

    let activitiesLoaded = false;
    let completionsLoaded = false;
    let ledgerLoaded = false;
    let rewardsLoaded = false;
    let redemptionsLoaded = false;
    let negotiationsLoaded = false;

    const checkLoaded = () => {
      const isParent = currentProfile.role === 'parent';
      if (
        activitiesLoaded &&
        completionsLoaded &&
        rewardsLoaded &&
        redemptionsLoaded &&
        negotiationsLoaded &&
        (isParent || ledgerLoaded)
      ) {
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

    // 4. Subscribe to Rewards
    unsubRewards = subscribeRewards(familyId, (rews) => {
      setRewards(rews);
      rewardsLoaded = true;
      checkLoaded();
    });

    // 5. Subscribe to Redemptions
    const redOpts = currentProfile.role === 'parent' ? {} : { kidId: currentProfile.id };
    unsubRedemptions = subscribeRedemptions(familyId, redOpts, (reds) => {
      setRedemptions(reds);
      redemptionsLoaded = true;
      checkLoaded();
    });

    // 6. Subscribe to Negotiations
    unsubNegotiations = subscribeNegotiations(familyId, {}, (negs) => {
      setNegotiations(negs);
      negotiationsLoaded = true;
      checkLoaded();
    });

    return () => {
      if (unsubActivities) unsubActivities();
      if (unsubCompletions) unsubCompletions();
      if (unsubLedger) unsubLedger();
      if (unsubRewards) unsubRewards();
      if (unsubRedemptions) unsubRedemptions();
      if (unsubNegotiations) unsubNegotiations();
    };
  }, [familyId, currentProfile]);

  return (
    <DataContext.Provider
      value={{
        activities,
        completions,
        ledger,
        rewards,
        redemptions,
        negotiations,
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
