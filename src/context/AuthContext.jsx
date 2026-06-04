import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, isMock } from '../firebase/config';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    if (isMock) {
      // Simulate Google Sign-In with mock user
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockUser = {
            uid: 'mock_user_12345',
            displayName: 'مستخدم أيام',
            email: 'mna80455@gmail.com',
            photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
          };
          localStorage.setItem('days_mock_user', JSON.stringify(mockUser));
          setCurrentUser(mockUser);
          setLoading(false);
          // Dispatch storage event manually for this tab
          window.dispatchEvent(new Event('storage'));
          resolve(mockUser);
        }, 1000);
      });
    } else {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        setLoading(false);
        return result.user;
      } catch (error) {
        setLoading(false);
        console.error('Google Sign-In failed:', error);
        throw error;
      }
    }
  };

  const loginAsGuest = async () => {
    setLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          uid: 'mock_user_guest',
          displayName: 'مستخدم تجريبي',
          email: 'guest@days.app',
          photoURL: '',
        };
        localStorage.setItem('days_force_mock', 'true');
        localStorage.setItem('days_mock_user', JSON.stringify(mockUser));
        setCurrentUser(mockUser);
        setLoading(false);
        window.dispatchEvent(new Event('storage'));
        resolve(mockUser);
      }, 500);
    });
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('days_force_mock');
    localStorage.removeItem('days_mock_user');
    if (isMock) {
      setCurrentUser(null);
      setLoading(false);
    } else {
      try {
        await fbSignOut(auth);
        setCurrentUser(null);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.error('Logout failed:', error);
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, loginWithGoogle, loginAsGuest, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
