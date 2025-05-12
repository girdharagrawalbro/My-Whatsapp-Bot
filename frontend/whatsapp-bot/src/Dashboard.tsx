// Dashboard.tsx
import { useState } from 'react'
import MessageHistory from './MessageHistory'
import WhatsAppScheduler from './WhatsAppScheduler'

export default function Dashboard () {
  const [activePage, setActivePage] = useState<'history' | 'scheduler'>(
    'history'
  )

  return (
    <div className='flex h-screen'>
      {/* Sidebar */}
      <aside className='w-64 bg-gray-800 text-white flex flex-col p-4'>
        <h2 className='text-2xl font-bold mb-6'>Dashboard</h2>
        <button
          onClick={() => setActivePage('history')}
          className={`mb-2 p-2 rounded ${
            activePage === 'history' ? 'bg-gray-700' : 'hover:bg-gray-700'
          }`}
        >
          Message History
        </button>
        <button
          onClick={() => setActivePage('scheduler')}
          className={`mb-2 p-2 rounded ${
            activePage === 'scheduler' ? 'bg-gray-700' : 'hover:bg-gray-700'
          }`}
        >
          WhatsApp Scheduler
        </button>
      </aside>

      {/* Content */}
      <main className='flex-1 overflow-y-auto p-6 bg-gray-50'>
        {activePage === 'history' ? <MessageHistory /> : <WhatsAppScheduler />}
      </main>
    </div>
  )
}
