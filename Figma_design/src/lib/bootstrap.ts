import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { familyDoc, profileDoc, activityDoc } from './paths';
import { Profile } from './types';
import { getStorageItem, setStorageItem } from './repos/localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

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
      
      setStorageItem(`profiles_${familyId}`, [parentProfile, miaProfile, leoProfile]);
      setStorageItem(`activities_${familyId}`, defaultActivities);
      setStorageItem(`completions_${familyId}`, []);
      setStorageItem(`ledger_${familyId}`, []);
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
      
      for (const act of defaultActivities) {
        await setDoc(activityDoc(familyId, act.id), act);
      }
      
      localStorage.setItem('fam_id', familyId);
    }
  }
  
  return familyId;
}
