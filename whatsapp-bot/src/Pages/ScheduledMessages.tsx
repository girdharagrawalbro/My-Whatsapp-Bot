'use client'
import { useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar
} from 'react-icons/fi'

export default function ScheduledMessages () {
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('')
  const itemsPerPage = 10

  // Fetch all scheduled messages from API
  useEffect(() => {
    const fetchAllScheduledMessages = async () => {
      try {
        setLoading(true)
        const res = await fetch('http://localhost:3000/api/scheduled-messages')
        const data = await res.json()
        setScheduledMessages(data)
      } catch (err) {
        console.error('Error fetching scheduled messages:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllScheduledMessages()
  }, [])

  const handleRefresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('http://localhost:3000/api/scheduled-messages/')
      const data = await res.json()
      setScheduledMessages(data)
    } catch (err) {
      console.error('Error refreshing messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (phone: string) =>
    `+${phone.slice(0, 2)} ${phone.slice(2)}`

  // Filter messages based on search term and filters
  const filteredMessages = scheduledMessages.filter(msg => {
    const matchesSearch =
      msg.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.users?.some((user: string) => user.includes(searchTerm))

    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter

    const matchesDate =
      !dateFilter ||
      new Date(msg.scheduledTime).toDateString() ===
        new Date(dateFilter).toDateString()

    return matchesSearch && matchesStatus && matchesDate
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentMessages = filteredMessages.slice(
    indexOfFirstItem,
    indexOfLastItem
  )
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage)

  return (
    <div className='bg-white rounded-lg border border-gray-200 shadow-sm m-6'>
      <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <h2 className='text-xl font-semibold text-gray-800 flex items-center gap-2'>
          <FiCalendar />
          All Scheduled Messages
        </h2>
        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
          <div className='relative flex-1 sm:w-64'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <FiSearch className='text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='Search messages or recipients...'
              className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className='flex items-center gap-2'>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className='px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            >
              <option value='all'>All Statuses</option>
              <option value='pending'>Pending</option>
              <option value='sent'>Sent</option>
              <option value='failed'>Failed</option>
            </select>

            <input
              type='date'
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className='px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
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
                                      ?.map((user: string) => formatPhone(user))
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
                        No scheduled messages found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredMessages.length > itemsPerPage && (
              <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
                <div className='text-sm text-gray-700'>
                  Showing{' '}
                  <span className='font-medium'>{indexOfFirstItem + 1}</span> to{' '}
                  <span className='font-medium'>
                    {Math.min(indexOfLastItem, filteredMessages.length)}
                  </span>{' '}
                  of{' '}
                  <span className='font-medium'>{filteredMessages.length}</span>{' '}
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
  )
}
