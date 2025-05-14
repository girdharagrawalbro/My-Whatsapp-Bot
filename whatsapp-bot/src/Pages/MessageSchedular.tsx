'use client'
import { useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiCheckSquare,
  FiCalendar
} from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function MessageScheduler () {
  const [message, setMessage] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/messages')
        const data = await res.json()
        const phoneSet = new Set(data.map((da: any) => da.user.phone))
        setUsers(Array.from(phoneSet)) // Convert Set to Array
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }

    fetchUsers()
  }, [])

  // Fetch scheduled messages for today from API
  useEffect(() => {
    const fetchScheduledMessages = async () => {
      try {
        setLoading(true)
        const res = await fetch('http://localhost:3000/api/scheduled-messages')
        const data = await res.json()

        // Get today's date at midnight
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get tomorrow's date at midnight
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todaysMessages = data.filter(message => {
          const messageDate = new Date(message.scheduledTime)
          return messageDate >= today && messageDate < tomorrow
        })

        setScheduledMessages(todaysMessages)
      } catch (err) {
        console.error('Error fetching scheduled messages:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScheduledMessages()
  }, [])

  const handleUserToggle = (user: string) => {
    setSelectedUsers(prev =>
      prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredRecipients.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredRecipients)
    }
  }

  const formatPhone = (phone: string) =>
    `+${phone.slice(0, 2)} ${phone.slice(2)}`

  const handleSend = async () => {
    if (!message || selectedUsers.length === 0) {
      toast.error('Please enter a message and select users.')
      return
    }

    try {
      const res = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          users: selectedUsers,
          scheduledTime
        })
      })

      if (!res.ok) throw new Error('Failed to send message')

      toast.success('Message scheduled or sent!')
      setMessage('')
      setScheduledTime('')
      setSelectedUsers([])
    } catch (err) {
      console.error(err)
      toast.error('Error sending message.')
    }
  }

  const handleRefresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('http://localhost:3000/api/scheduled-messages/')
      const data = await res.json()
      // Get today's date at midnight
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get tomorrow's date at midnight
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todaysMessages = data.filter(message => {
        const messageDate = new Date(message.scheduledTime)
        return messageDate >= today && messageDate < tomorrow
      })

      setScheduledMessages(todaysMessages)
    } catch (err) {
      console.error('Error refreshing messages:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter recipients based on search term
  const filteredRecipients = users.filter(user =>
    user.toLowerCase().includes(recipientSearch.toLowerCase())
  )

  // Pagination for scheduled messages
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentMessages = scheduledMessages.slice(
    indexOfFirstItem,
    indexOfLastItem
  )
  const totalPages = Math.ceil(scheduledMessages.length / itemsPerPage)

  return (
    <>
      <div className='bg-white rounded-lg border border-gray-200 shadow-sm m-6'>
        <h2 className='text-xl font-semibold p-4 border-b border-gray-200'>
          Schedule WhatsApp Message
        </h2>

        <div className='px-6 py-4'>
          <div className='mb-4'>
            <label className='block mb-1 font-medium'>Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder='Type your message here...'
              className='w-full p-3 border border-gray-300 rounded-lg'
              rows={4}
            />
          </div>

          <div className='mb-4'>
            <label className='block mb-1 font-medium'>
              Schedule Time (Optional)
            </label>
            <input
              type='datetime-local'
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className='w-full p-3 border border-gray-300 rounded-lg'
            />
          </div>

          <div className='mb-4'>
            <div className='flex justify-between items-center mb-2'>
              <label className='block font-medium'>Select Recipients</label>
              <div className='relative w-64'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <FiSearch className='text-gray-400' />
                </div>
                <input
                  type='text'
                  placeholder='Search recipients...'
                  className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                />
              </div>
            </div>

            <div className='mb-2'>
              <button
                onClick={handleSelectAll}
                className={`flex items-center gap-2 text-sm border border-gray-300  px-4 py-2 rounded-lg transition ${
                  selectedUsers.length === filteredRecipients.length &&
                  filteredRecipients.length > 0
                    ? 'bg-green-600 text-white'
                    : 'bg-white hover:bg-gray-200'
                }`}
              >
                <FiCheckSquare />
                <span>
                  {selectedUsers.length === filteredRecipients.length &&
                  filteredRecipients.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </button>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2'>
              {filteredRecipients.map(phone => (
                <button
                  key={phone}
                  onClick={() => handleUserToggle(phone)}
                  className={`text-sm border px-4 py-2 rounded-full transition border-gray-300 ${
                    selectedUsers.includes(phone)
                      ? 'bg-green-600 text-white'
                      : 'bg-white hover:bg-gray-200'
                  }`}
                >
                  {formatPhone(phone)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSend}
            className='px-4 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700'
          >
            Send / Schedule
          </button>
        </div>
      </div>

      <div className=' border rounded-lg border-gray-200 shadow-sm m-6 sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <h2 className='text-xl font-semibold text-gray-800 flex items-center gap-2'>
            <FiCalendar />
            All Scheduled Messages
          </h2>
          <div className='  flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
            <div className='relative flex-1 sm:w-64'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <FiSearch className='text-gray-400' />
              </div>
              <input
                type='text'
                placeholder='Search messages...'
                className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              onClick={handleRefresh}
              disabled={loading}
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
              <FiFilter />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className=''>
          {loading ? (
            <div className='p-8 flex justify-center items-center'>
              <div className='animate-pulse flex space-x-4'>
                <div className='flex-1 space-y-4 py-1'>
                  <div className='h-4 bg-gray-200 rounded w-3/4'></div>
                  <div className='space-y-2'>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className='h-4 bg-gray-200 rounded'></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th
                        scope='col'
                        className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                      >
                        S.No.
                      </th>
                      <th
                        scope='col'
                        className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                      >
                        Recipients
                      </th>
                      <th
                        scope='col'
                        className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                      >
                        Message
                      </th>
                      <th
                        scope='col'
                        className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                      >
                        Scheduled Time
                      </th>
                      <th
                        scope='col'
                        className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {currentMessages.length > 0 ? (
                      currentMessages.map((msg, index) => (
                        <tr key={msg._id || index} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {indexOfFirstItem + index + 1}
                          </td>
                          <td className='px-6 py-4 relative group'>
                            <div className='text-sm font-medium text-gray-900'>
                              {msg.users?.length <= 2 ? (
                                msg.users
                                  ?.map((user: string) => formatPhone(user))
                                  .join(', ')
                              ) : (
                                <>
                                  {`${formatPhone(msg.users[0])}, ${formatPhone(
                                    msg.users[1]
                                  )} +${msg.users.length - 2} more`}
                                  <div className='absolute z-10 invisible group-hover:visible w-64 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                                    <div className='whitespace-normal break-words'>
                                      {msg.users
                                        ?.map((user: string) =>
                                          formatPhone(user)
                                        )
                                        .join(', ')}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className='px-6 py-4 text-sm text-gray-500 max-w-xs relative group'>
                            <div className='truncate'>{msg.message}</div>
                            {msg.message &&
                              msg.message.length > 50 && ( // Only show tooltip if text is long
                                <div className='absolute z-10 invisible group-hover:visible w-64 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                                  <div className='whitespace-normal break-words'>
                                    {msg.message}
                                  </div>
                                </div>
                              )}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {msg.scheduledTime
                              ? new Date(msg.scheduledTime).toLocaleString()
                              : 'Immediate'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                msg.status === 'sent'
                                  ? 'bg-green-100 text-green-800'
                                  : msg.status === 'scheduled'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {msg.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className='px-6 py-4 text-center text-sm text-gray-500'
                        >
                          No scheduled messages for today
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {scheduledMessages.length > itemsPerPage && (
                <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
                  <div className='text-sm text-gray-700'>
                    Showing{' '}
                    <span className='font-medium'>{indexOfFirstItem + 1}</span>{' '}
                    to{' '}
                    <span className='font-medium'>
                      {Math.min(indexOfLastItem, scheduledMessages.length)}
                    </span>{' '}
                    of{' '}
                    <span className='font-medium'>
                      {scheduledMessages.length}
                    </span>{' '}
                    results
                  </div>
                  <div className='flex space-x-2'>
                    <button
                      onClick={() =>
                        setCurrentPage(prev => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <FiChevronLeft />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage(prev => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
