'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create/get user mutation
  const createUserMutation = trpc.user.createUser.useMutation();

  // Get user by email query
  const { data: user, refetch: refetchUser } = trpc.user.getUserByEmail.useQuery(
    { email: userEmail! },
    { 
      enabled: !!userEmail && isInitialized,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      const storedUserEmail = localStorage.getItem('userEmail');
      
      if (storedUserId && storedUserEmail) {
        setUserId(storedUserId);
        setUserEmail(storedUserEmail);
      }
      setIsInitialized(true);
    }
  }, []);

  const login = async (email: string, name?: string) => {
    try {
      const user = await createUserMutation.mutateAsync({
        email,
        name,
      });
      
      setUserId(user.id);
      setUserEmail(user.email);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userEmail', user.email);
      }
      
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUserId(null);
    setUserEmail(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
    }
  };

  return {
    userId,
    userEmail,
    user,
    login,
    logout,
    isLoading: createUserMutation.isPending,
    isInitialized,
  };
}