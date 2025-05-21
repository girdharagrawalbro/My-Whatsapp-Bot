import { useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEyeOff,
  FiCheckSquare,
  FiSquare
} from 'react-icons/fi'

interface Message {
  _id: string
  user: {
    phone: string
  }
  text: string
  aiReply: string
  timestamp: string
  status: 'pending' | 'replied' | 'error'
  hidden: boolean
}

export default function Messages () {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    showHidden: false
  })

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `http://localhost:3000/api/messages`
        )
        const data = await res.json()
        setMessages(data)
        setSelectedMessages([])
        setSelectAll(false)
      } catch (err) {
        setError('Failed to load messages')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [])

  const handleRefresh = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `http://localhost:3000/api/messages`
      )
      const data = await res.json()
      setMessages(data)
      setSelectedMessages([])
      setSelectAll(false)
    } catch (err) {
      setError('Failed to load messages')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedMessages([])
    } else {
      setSelectedMessages(currentMessages.map(msg => msg._id))
    }
    setSelectAll(!selectAll)
  }

  const toggleMessageSelection = (id: string) => {
    setSelectedMessages(prev =>
      prev.includes(id) ? prev.filter(msgId => msgId !== id) : [...prev, id]
    )
  }

  const toggleMessageVisibility = async (ids: string[], hide: boolean) => {
    try {
      setLoading(true)
      const res = await fetch(
        'http://localhost:3000/api/messages/visibility',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids, hidden: hide })
        }
      )

      if (res.ok) {
        // Update local state
        setMessages(
          messages.map(msg =>
            ids.includes(msg._id) ? { ...msg, hidden: hide } : msg
          )
        )
        setSelectedMessages([])
        setSelectAll(false)
      }
    } catch (err) {
      setError('Failed to update visibility')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (newFilters: Partial<typeof filters>) => {
    setFilters({ ...filters, ...newFilters })
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      date: '',
      showHidden: false
    })
  }
  const filteredMessages = messages.filter(msg => {
    const matchesSearch =
      msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.user?.phone?.includes(searchTerm)

    const matchesStatus =
      filters.status === 'all' || msg.status === filters.status

    const matchesDate =
      !filters.date ||
      new Date(msg.timestamp).toDateString() ===
        new Date(filters.date).toDateString()

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
    <div className='bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden my-6 mx-4 z-10'>
      <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <h2 className='text-lg font-semibold text-gray-800'>Message History</h2>
        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
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
          <div>
            <select
              className='w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
              value={filters.status}
              onChange={e => applyFilters({ status: e.target.value })}
            >
              <option value=''>All Statuses</option>
              <option value='replied'>Replied</option>
              <option value='error'>Error</option>
            </select>
          </div>

          <div>
            <input
              type='date'
              className='w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
              onChange={e => applyFilters({ date: e.target.value })}
              value={filters.date}
            />
          </div>
          <div className='flex items-end'>
            <button
              className='px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors'
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
          <button
            className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            onClick={handleRefresh}
            disabled={loading}
          >
            <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {selectedMessages.length > 0 && (
            <div className='flex gap-2'>
              <button
                className='flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
                onClick={() => {
                  if (
                    window.confirm(
                      'Are you sure you want to hide the selected messages?'
                    )
                  ) {
                    toggleMessageVisibility(selectedMessages, true)
                  }
                }}
              >
                <FiEyeOff />
                <span>Hide</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className='text-red-500 p-4'>{error}</div>
      ) : loading ? (
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
                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    <div className='flex items-center'>
                      <button onClick={toggleSelectAll} className='mr-2'>
                        {selectAll ? (
                          <FiCheckSquare className='text-indigo-600' />
                        ) : (
                          <FiSquare />
                        )}
                      </button>
                      S.No.
                    </div>
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    From
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Text
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Reply
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Status
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Timestamp
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {currentMessages.length > 0 ? (
                  currentMessages.map((msg, index) => (
                    <tr
                      key={msg._id}
                      className={`hover:bg-gray-50 ${
                        msg.hidden ? 'bg-gray-100' : ''
                      }`}
                    >
                      <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-500'>
                        <div className='flex items-center'>
                          <input
                            type='checkbox'
                            checked={selectedMessages.includes(msg._id)}
                            onChange={() => toggleMessageSelection(msg._id)}
                            className='mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-gray-200'
                          />
                          {indexOfFirstItem + index + 1}
                        </div>
                      </td>
                      <td className='px-4 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900'>
                          {msg.user.phone
                            ? `+${msg.user.phone.slice(
                                0,
                                2
                              )} ${msg.user.phone.slice(2)}`
                            : ''}
                        </div>
                      </td>
                      <td className='px-4 py-4 text-sm text-gray-500 max-w-xs  group'>
                        <div className='truncate'>{msg.text}</div>
                        {msg.text && msg.text.length > 50 && (
                          <div className='absolute z-10 invisible group-hover:visible w-64 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                            <div className='whitespace-normal break-words'>
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className='px-4 py-4 text-sm text-gray-500 max-w-xs relative group'>
                        {!msg.aiReply?.trim() ? (
                          <span
                            className={`px-2 py-1 rounded-full ${
                              msg.status === 'pending'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {msg.status}
                          </span>
                        ) : (
                          <>
                            {/* The whole td is now interactive */}
                            <div className='truncate'>{msg.aiReply}</div>

                            {/* Tooltip on hover */}
                            {msg.aiReply.length > 50 && (
                              <div className='absolute left-0 top-full mt-2 z-50 w-max max-w-md p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300'>
                                <div className='whitespace-normal break-words'>
                                  {msg.aiReply}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td className='px-4 py-4 whitespace-nowrap'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            msg.status === 'replied'
                              ? 'bg-green-100 text-green-800'
                              : msg.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {msg.status}
                        </span>
                      </td>
                      <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {new Date(msg.timestamp).toLocaleString()}
                      </td>
                      <td className='px-4 py-4 whitespace-nowrap text-sm font-medium'>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                'Are you sure you want to hide the selected messages?'
                              )
                            ) {
                              toggleMessageVisibility([msg._id], !msg.hidden)
                            }
                          }}
                          className='flex items-center gap-1 px-3 py-1 rounded-md
                              bg-gray-100 text-gray-800 hover:bg-gray-200'
                        >
                          <FiEyeOff />
                          <span>Hide</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-4 py-4 text-center text-sm text-gray-500'
                    >
                      No messages found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredMessages.length > itemsPerPage && (
            <div className='px-4 py-4 border-t border-gray-200 flex items-center justify-between'>
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
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
  )
}
