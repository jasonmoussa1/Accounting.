
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseReady } from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseReady && auth) {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false);
        });
        return unsubscribe;
    } else {
        // If Firebase is not ready, we are not loading, but we are also not logged in (yet)
        setLoading(false);
    }
  }, []);

  const loginWithGoogle = async () => {
    if (!isFirebaseReady || !auth) {
        // Dev Mode Bypass
        console.warn("Firebase not configured. Using Dev User.");
        const devUser: any = {
            uid: 'dev_user_123',
            displayName: 'Dev User',
            email: 'dev@jasonos.com',
            photoURL: null,
            emailVerified: true
        };
        setCurrentUser(devUser);
        return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Failed", error);
      alert("Login failed. Check console.");
    }
  };

  const logout = async () => {
    if (!isFirebaseReady || !auth) {
        setCurrentUser(null);
        return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, loginWithGoogle, logout, isDevMode: !isFirebaseReady }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
