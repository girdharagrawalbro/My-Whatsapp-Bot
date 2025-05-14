import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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

import { Toaster } from 'react-hot-toast'

function App () {
  return (
    <Router>
      <div className='flex'>
        <Sidebar />
        <div className='ml-64 flex-1 w-full h-full'>
          <Routes>
            <Route path='/' element={<Dashboard />} />
            <Route path='/messages' element={<Messages />} />
            <Route path='/messageschedular' element={<MessageSchedular />} />
            <Route path='/scheduledmessage' element={<ScheduledMessages />} />
            <Route path='/speechgenerator' element={<SpeechGenerator />} />
            <Route path='/manageusers' element={<ManageUsers />} />
            <Route path='/employeedata' element={<EmployeeData />} />
            <Route path='/partydata' element={<PartyData />} />
            <Route path='/settings' element={<Settings />} />
          </Routes>
        </div>
        <Toaster position='top-center' reverseOrder={false} />
      </div>
    </Router>
  )
}

export default App
