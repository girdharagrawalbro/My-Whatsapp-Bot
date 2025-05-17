import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberMe: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage on initial load
    const savedAuth = localStorage.getItem('isAuthenticated');
    return savedAuth === 'true';
  });

  useEffect(() => {
    // Update localStorage when authentication state changes
    localStorage.setItem('isAuthenticated', isAuthenticated.toString());
  }, [isAuthenticated]);

  const login = (username: string, password: string, rememberMe: boolean) => {
    if (username === 'admin' && password === 'password') {
      setIsAuthenticated(true);
      if (rememberMe) {
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
      }
    } else {
      alert('Invalid credentials');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    // Clear stored credentials on logout
    localStorage.removeItem('username');
    localStorage.removeItem('password');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 