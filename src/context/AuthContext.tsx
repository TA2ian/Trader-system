import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, firebaseLib } from "../lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

export interface UserSession {
  email: string;
  name: string;
  role: 'developer' | 'owner' | 'delegate';
  company_id: string;
  isDevMode: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  login: (email: string, name: string) => void;
  logout: () => void;
  setCompanyId: (companyId: string) => void;
  toggleDevMode: () => void;
  setRole: (role: 'developer' | 'owner' | 'delegate') => void;
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
  currentRates: {
    damascus: number;
    aleppo: number;
    idlib: number;
  };
  setRates: (rates: { damascus: number; aleppo: number; idlib: number }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isOffline, setOffline] = useState<boolean>(false);
  const [currentRates, setRates] = useState({
    damascus: 15100,
    aleppo: 15200,
    idlib: 15500
  });

  // Load session from local storage on mount
  useEffect(() => {
    const checkConnection = async () => {
        try {
            await getDocs(query(collection(db, 'customers'), limit(1)));
            setOffline(false); // Connected
            firebaseLib.setOffline(false);
        } catch (e) {
            setOffline(true); // Offline
            firebaseLib.setOffline(true);
        }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('surya_session');
    if (savedSession) {
      try {
        setUser(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem('surya_session');
      }
    } else {
      // Auto-login default user for quick preview, but let them login properly
      const defaultUser: UserSession = {
        email: 'ma7m0ud.love1997@gmail.com',
        name: 'محمود المطور الأقدم',
        role: 'developer',
        company_id: '1',
        isDevMode: true
      };
      setUser(defaultUser);
      localStorage.setItem('surya_session', JSON.stringify(defaultUser));
    }

    const savedRates = localStorage.getItem('surya_exchange_rates');
    if (savedRates) {
      try {
        setRates(JSON.parse(savedRates));
      } catch (e) {}
    }
  }, []);

  const login = (email: string, name: string) => {
    // Detect developer account
    const isDev = email.trim().toLowerCase() === 'ma7m0ud.love1997@gmail.com';
    const session: UserSession = {
      email: email.trim(),
      name: name || (isDev ? 'محمود المطور الأقدم' : 'تاجر سورياً جديد'),
      role: isDev ? 'developer' : 'owner',
      company_id: isDev ? '1' : `company_${Math.random().toString(36).substring(2, 6)}`,
      isDevMode: isDev
    };

    setUser(session);
    localStorage.setItem('surya_session', JSON.stringify(session));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('surya_session');
  };

  const setCompanyId = (companyId: string) => {
    if (!user) return;
    const updated = { ...user, company_id: companyId };
    setUser(updated);
    localStorage.setItem('surya_session', JSON.stringify(updated));
  };

  const toggleDevMode = () => {
    if (!user) return;
    const updated = { ...user, isDevMode: !user.isDevMode };
    setUser(updated);
    localStorage.setItem('surya_session', JSON.stringify(updated));
  };

  const setRole = (role: 'developer' | 'owner' | 'delegate') => {
    if (!user) return;
    const updated = { ...user, role };
    setUser(updated);
    localStorage.setItem('surya_session', JSON.stringify(updated));
  };

  const handleUpdateRates = (newRates: typeof currentRates) => {
    setRates(newRates);
    localStorage.setItem('surya_exchange_rates', JSON.stringify(newRates));
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      setCompanyId,
      toggleDevMode,
      setRole,
      isOffline,
      setOffline,
      currentRates,
      setRates: handleUpdateRates
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
