import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Dashboard from './Pages/Dashboard'
import Messages from './Pages/Messages'
import MessageSchedular from './Pages/MessageSchedular'
import ScheduledMessages from './Pages/ScheduledMessages'
import SpeechGenerator from './Pages/SpeechGenerator'
import ManageUsers from './Pages/ManageUsers'
import EmployeeData from './Pages/EmployeeData'
import PartyData from './Pages/PartyData'
import Settings from './Pages/Settings'
import Sidebar from './components/Sidebar'
import Login from './Pages/Login'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/AuthContext'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App () {
  return (
    <AuthProvider>
      <Router>
        <div className='flex'>
          <Sidebar />
          <div className='ml-64 flex-1 w-full h-full'>
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route path='/' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path='/messages' element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path='/messageschedular' element={<ProtectedRoute><MessageSchedular /></ProtectedRoute>} />
              <Route path='/scheduledmessage' element={<ProtectedRoute><ScheduledMessages /></ProtectedRoute>} />
              <Route path='/speechgenerator' element={<ProtectedRoute><SpeechGenerator /></ProtectedRoute>} />
              <Route path='/manageusers' element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
              <Route path='/employeedata' element={<ProtectedRoute><EmployeeData /></ProtectedRoute>} />
              <Route path='/partydata' element={<ProtectedRoute><PartyData /></ProtectedRoute>} />
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
