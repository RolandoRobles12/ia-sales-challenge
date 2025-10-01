'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile, UserRole } from '@/types';

export function useUserRole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [role, setRole] = useState<UserRole>('user');
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  const userProfileDoc = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'userProfiles', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileDoc);

  useEffect(() => {
    if (isUserLoading || isLoadingProfile) {
      setIsLoadingRole(true);
      return;
    }

    if (!user) {
      setRole('user');
      setIsLoadingRole(false);
      return;
    }

    // Si existe el perfil, usar el rol del perfil
    if (userProfile) {
      setRole(userProfile.role || 'user');
    } else {
      // Si no existe perfil, es usuario normal
      setRole('user');
    }

    setIsLoadingRole(false);
  }, [user, userProfile, isUserLoading, isLoadingProfile]);

  return {
    role,
    isAdmin: role === 'admin',
    isLoadingRole: isLoadingRole || isUserLoading,
    userProfile,
  };
}