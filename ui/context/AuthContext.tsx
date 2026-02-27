import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenStorage } from '@/services/tokenStorage';
import { authService } from '@/services/apiClient';
import type { Owner } from '@/services/apiTypes';

interface AuthContextType {
  user: Owner | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: Owner) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Owner | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      const isValid = await tokenStorage.isTokenValid();

      if (token && isValid) {
        const response = await authService.getCurrentUser();
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        await tokenStorage.clearTokens();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
      await tokenStorage.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: Owner) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      await tokenStorage.clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
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
