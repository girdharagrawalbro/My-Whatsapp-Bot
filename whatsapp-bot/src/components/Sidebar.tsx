import { NavLink } from 'react-router-dom'

export default function Sidebar () {
  return (
    <aside className='w-64 h-full min-h-screen bg-gray-900 fixed top-0 left-0 text-white flex flex-col'>
      <div className='p-4 border-b border-gray-700'>
        <h1 className='text-2xl font-bold flex items-center gap-2'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-6 w-6'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
            />
          </svg>
          Whatsapp Bot
        </h1>
     
      </div>
      <nav className='flex-1 px-4 py-2 space-y-2'>
        <NavLink
          to='/'
          className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
            />
          </svg>
          Dashboard
        </NavLink>
        
        <NavLink
          to='/messageschedular'
          className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            />
          </svg>
          Schedule Message
        </NavLink>

         <NavLink
          to='/scheduledmessage'
          className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            />
          </svg>
          Scheduled Messages
        </NavLink>
          <NavLink
          to='/manageusers'
          className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
            />
          </svg>
          Manage Users
        </NavLink>
        <NavLink
          to='/manageevents'
          className={({ isActive }) =>
            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
            />
          </svg>
          Manage Events
        </NavLink>
       
        <NavLink
          to='/templates'
          className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
            />
          </svg>
      Template Management
        </NavLink>
        <NavLink
          to='/settings'
          className={({ isActive }) =>
            `flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-indigo-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
            />
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
            />
          </svg>
          Settings
        </NavLink>
      </nav>
      <div className='p-4 border-t border-gray-700'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center'>
            <span className='font-medium'>AD</span>
          </div>
          <div>
            <p className='font-medium'>Admin User</p>
            <p className='text-xs text-gray-400'>admin@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
