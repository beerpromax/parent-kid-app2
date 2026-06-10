import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { familyDoc, profileDoc, activityDoc, rewardDoc, growthEntryDoc } from './paths';
import { Profile } from './types';
import { getStorageItem, setStorageItem } from './repos/localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function getDefaultGrowthEntries(familyId: string) {
  return [
    {
      id: 'entry_sample_1',
      familyId,
      kidId: 'profile_mia',
      date: new Date().toISOString().split('T')[0],
      title: 'Finished Lego Castle Assembly',
      activityContent: 'Spent a focused afternoon sorting bricks and completing the towers of the castle. Showed great patience!',
      durationMinutes: 60,
      participantProfileIds: ['profile_mia', 'profile_parent'],
      participantNames: ['Grandma'],
      moodTag: 'joyful' as const,
      energyTag: 'high' as const,
      note: 'Mia did a great job following the diagram instructions all by herself.',
      photos: [
        {
          id: 'photo_sample_1',
          storagePath: `families/${familyId}/growth/profile_mia/entry_sample_1/photo_sample_1.jpg`,
          downloadURL: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&auto=format&fit=crop&q=60',
          thumbnailURL: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=300&auto=format&fit=crop&q=60',
          uploadedAt: Date.now()
        }
      ],
      status: 'active' as const,
      createdByProfileId: 'profile_parent',
      createdAt: Date.now() - 3600000 * 2,
      updatedAt: Date.now() - 3600000 * 2
    },
    {
      id: 'entry_sample_2',
      familyId,
      kidId: 'profile_mia',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      title: 'Daily Math Exercises & Reading',
      activityContent: 'Completed all 10 algebra problems and read 3 chapters of Charlotte Web.',
      durationMinutes: 45,
      participantProfileIds: ['profile_mia'],
      participantNames: [],
      moodTag: 'calm' as const,
      energyTag: 'medium' as const,
      note: 'Read aloud very clearly today.',
      photos: [],
      status: 'active' as const,
      createdByProfileId: 'profile_mia',
      createdAt: Date.now() - 86400000 - 3600000,
      updatedAt: Date.now() - 86400000 - 3600000
    }
  ];
}

export async function ensureFamily(): Promise<string> {
  let familyId = localStorage.getItem('fam_id');
  
  const needsLocalSeed = useLocalStorage && (!familyId || !localStorage.getItem(`profiles_${familyId}`));
  const needsFirestoreSeed = !useLocalStorage && !familyId;

  if (needsLocalSeed || needsFirestoreSeed) {
    if (useLocalStorage) {
      familyId = 'local-demo-family';
      console.log(`Bootstrapping new local family with ID: ${familyId}`);
      
      const parentId = 'profile_parent';
      const parentProfile: Profile = {
        id: parentId,
        familyId,
        name: 'Parent',
        role: 'parent',
        color: '#ff8b3d', // primary orange
        emoji: '👑',
        tokenBalance: 0,
        createdAt: Date.now()
      };
      
      const miaId = 'profile_mia';
      const miaProfile: Profile = {
        id: miaId,
        familyId,
        name: 'Mia',
        role: 'kid',
        color: '#ffb88c', // soft pink/orange
        emoji: '👧',
        tokenBalance: 45,
        createdAt: Date.now()
      };
      
      const leoId = 'profile_leo';
      const leoProfile: Profile = {
        id: leoId,
        familyId,
        name: 'Leo',
        role: 'kid',
        color: '#ffd6a5', // light yellow/orange
        emoji: '👦',
        tokenBalance: 15,
        createdAt: Date.now()
      };
      
      const defaultActivities = [
        {
          id: 'act_clean_room',
          familyId,
          title: 'Clean your room',
          description: 'Make bed, organize toys, vacuum floor',
          durationMinutes: 20,
          tokenValue: 10,
          assignedKidIds: [], // Assigned to ALL
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'act_homework',
          familyId,
          title: 'Homework time',
          description: 'Complete all homework assignments',
          durationMinutes: 45,
          tokenValue: 15,
          assignedKidIds: [], // Assigned to ALL
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'act_dishes',
          familyId,
          title: 'Help with dishes',
          description: 'Clear table and load dishwasher',
          durationMinutes: 15,
          tokenValue: 5,
          assignedKidIds: [], // Assigned to ALL
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'act_read',
          familyId,
          title: 'Read for 30 minutes',
          description: 'Read a book of your choice',
          durationMinutes: 30,
          tokenValue: 8,
          assignedKidIds: ['profile_mia'], // Mia only!
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      
      const defaultRewards = [
        {
          id: 'rew_ice_cream',
          familyId,
          title: 'Ice Cream Treat',
          description: 'A delicious double-scoop ice cream with toppings!',
          tokenCost: 15,
          forKidIds: [],
          status: 'active' as const,
          proposedByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'rew_screen_time',
          familyId,
          title: 'Extra 30 Min Screen Time',
          description: '30 additional minutes of gaming or video time.',
          tokenCost: 25,
          forKidIds: [],
          status: 'active' as const,
          proposedByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'rew_lego_set',
          familyId,
          title: 'New Lego Set',
          description: 'A brand new small Lego Creator set.',
          tokenCost: 0,
          forKidIds: ['profile_mia'],
          status: 'proposed' as const,
          proposedByProfileId: 'profile_mia',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const defaultGrowthEntries = getDefaultGrowthEntries(familyId);

      setStorageItem(`profiles_${familyId}`, [parentProfile, miaProfile, leoProfile]);
      setStorageItem(`activities_${familyId}`, defaultActivities);
      setStorageItem(`rewards_${familyId}`, defaultRewards);
      setStorageItem(`redemptions_${familyId}`, []);
      setStorageItem(`negotiations_${familyId}`, []);
      setStorageItem(`offers_${familyId}`, []);
      setStorageItem(`completions_${familyId}`, []);
      setStorageItem(`ledger_${familyId}`, []);
      setStorageItem(`growthLog_${familyId}`, defaultGrowthEntries);
      localStorage.setItem('fam_id', familyId);
    } else {
      const familyRef = doc(collection(db, 'families'));
      familyId = familyRef.id;
      
      console.log(`Bootstrapping new Firestore family with ID: ${familyId}`);
      
      await setDoc(familyDoc(familyId), {
        name: 'Demo Family',
        createdAt: Date.now()
      });
      
      const parentId = 'profile_parent';
      const parentProfile: Profile = {
        id: parentId,
        familyId,
        name: 'Parent',
        role: 'parent',
        color: '#ff8b3d', // primary orange
        emoji: '👑',
        tokenBalance: 0,
        createdAt: Date.now()
      };
      await setDoc(profileDoc(familyId, parentId), parentProfile);
      
      const miaId = 'profile_mia';
      const miaProfile: Profile = {
        id: miaId,
        familyId,
        name: 'Mia',
        role: 'kid',
        color: '#ffb88c', // soft pink/orange
        emoji: '👧',
        tokenBalance: 45,
        createdAt: Date.now()
      };
      await setDoc(profileDoc(familyId, miaId), miaProfile);
      
      const leoId = 'profile_leo';
      const leoProfile: Profile = {
        id: leoId,
        familyId,
        name: 'Leo',
        role: 'kid',
        color: '#ffd6a5', // light yellow/orange
        emoji: '👦',
        tokenBalance: 15,
        createdAt: Date.now()
      };
      await setDoc(profileDoc(familyId, leoId), leoProfile);
      
      const defaultActivities = [
        {
          id: 'act_clean_room',
          familyId,
          title: 'Clean your room',
          description: 'Make bed, organize toys, vacuum floor',
          durationMinutes: 20,
          tokenValue: 10,
          assignedKidIds: [], // Assigned to ALL
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'act_homework',
          familyId,
          title: 'Homework time',
          description: 'Complete all homework assignments',
          durationMinutes: 45,
          tokenValue: 15,
          assignedKidIds: [], // Assigned to ALL
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'act_dishes',
          familyId,
          title: 'Help with dishes',
          description: 'Clear table and load dishwasher',
          durationMinutes: 15,
          tokenValue: 5,
          assignedKidIds: [], // Assigned to ALL
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'act_read',
          familyId,
          title: 'Read for 30 minutes',
          description: 'Read a book of your choice',
          durationMinutes: 30,
          tokenValue: 8,
          assignedKidIds: ['profile_mia'], // Mia only!
          status: 'active' as const,
          createdByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      
      const defaultRewards = [
        {
          id: 'rew_ice_cream',
          familyId,
          title: 'Ice Cream Treat',
          description: 'A delicious double-scoop ice cream with toppings!',
          tokenCost: 15,
          forKidIds: [],
          status: 'active' as const,
          proposedByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'rew_screen_time',
          familyId,
          title: 'Extra 30 Min Screen Time',
          description: '30 additional minutes of gaming or video time.',
          tokenCost: 25,
          forKidIds: [],
          status: 'active' as const,
          proposedByProfileId: parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'rew_lego_set',
          familyId,
          title: 'New Lego Set',
          description: 'A brand new small Lego Creator set.',
          tokenCost: 0,
          forKidIds: ['profile_mia'],
          status: 'proposed' as const,
          proposedByProfileId: 'profile_mia',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      for (const act of defaultActivities) {
        await setDoc(activityDoc(familyId, act.id), act);
      }
      for (const rew of defaultRewards) {
        await setDoc(rewardDoc(familyId, rew.id), rew);
      }
      
      const defaultGrowthEntries = getDefaultGrowthEntries(familyId);
      for (const entry of defaultGrowthEntries) {
        await setDoc(growthEntryDoc(familyId, entry.id), entry);
      }
      
      localStorage.setItem('fam_id', familyId);
    }
  }
  
  return familyId;
}
