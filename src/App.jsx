import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Morning from './pages/Morning';
import Evening from './pages/Evening';
import Memories from './pages/Memories';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import LifeWeeks from './pages/LifeWeeks';
import CalendarPage from './pages/Calendar'; // Called CalendarPage to avoid clashing with React global/built-in objects if needed
import Habits from './pages/Habits';
import Refuge from './pages/Refuge';
import Sleep from './pages/Sleep';

// Auth Guard Wrapper
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />

            {/* Protected application routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Redirect root '/' to '/dashboard' */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="morning" element={<Morning />} />
              <Route path="evening" element={<Evening />} />
              <Route path="memories" element={<Memories />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="life-weeks" element={<LifeWeeks />} />
              <Route path="habits" element={<Habits />} />
              <Route path="refuge" element={<Refuge />} />
              <Route path="sleep" element={<Sleep />} />
            </Route>

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
