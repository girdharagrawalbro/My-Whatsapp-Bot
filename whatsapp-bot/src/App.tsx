import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Dashboard from './Pages/Dashboard'
import MessageSchedular from './Pages/MessageSchedular'
import ScheduledMessages from './Pages/ScheduledMessages'
import ManageEvents from './Pages/ManageEvents'
import ManageUsers from './Pages/ManageUsers'
import Settings from './Pages/Settings'
import Sidebar from './components/Sidebar'
import NotFound from './NotFound';
import TemplateManagement from './Pages/TemplateManagement'
import Login from './Pages/Login'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/AuthContext'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className='flex'>
          <Sidebar />
          <div className='ml-64 flex-1 w-full h-full'>
            <Routes>
              <Route path="*" element={<NotFound />} />
              <Route path='/login' element={<Login />} />
              <Route path='/' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path='/messageschedular' element={<ProtectedRoute><MessageSchedular /></ProtectedRoute>} />
              <Route path='/scheduledmessage' element={<ProtectedRoute><ScheduledMessages /></ProtectedRoute>} />
              <Route path='/manageevents' element={<ProtectedRoute><ManageEvents /></ProtectedRoute>} />
              <Route path='/manageusers' element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
              <Route path='/templates' element={<ProtectedRoute><TemplateManagement /></ProtectedRoute>} />
              <Route path='/settings' element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            </Routes>
          </div>
          <Toaster position='top-center' reverseOrder={false} />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
