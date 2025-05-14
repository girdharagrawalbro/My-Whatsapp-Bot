import { useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight
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
}

export default function Messages () {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true)
        const res = await fetch('http://localhost:3000/api/messages')
        const data = await res.json()

        setMessages(data)
      } catch (err) {
        setError('Failed to load messages')
        console.log(err)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  const filteredMessages = messages.filter(msg => {
    // Safely handle potentially undefined properties

    const text = msg.text?.toLowerCase() || ''
    const aiReply = msg.aiReply?.toLowerCase() || ''
    const searchTermLower = searchTerm.toLowerCase()

    return text.includes(searchTermLower) || aiReply.includes(searchTermLower)
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
    <div className='bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden m-6'>
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
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    S.No.
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    From
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Text
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Reply
                  </th>

                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {currentMessages.length > 0 ? (
                  currentMessages.map((msg, index) => (
                    <tr key={msg._id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900'>
                          {msg.user.phone
                            ? `+${msg.user.phone.slice(
                                0,
                                2
                              )} ${msg.user.phone.slice(2)}`
                            : ''}
                        </div>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500 max-w-xs relative group'>
                        <div className='truncate'>{msg.text}</div>
                        {msg.text &&
                          msg.text.length > 50 && ( // Only show tooltip if text is long
                              <div className='absolute z-10 invisible group-hover:visible w-64 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                              <div className='whitespace-normal break-words'>
                                {msg.text}
                              </div>
                            </div>
                          )}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500 max-w-xs relative group'>
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
                            <div className='truncate'>{msg.aiReply}</div>
                            {msg.aiReply.length > 50 && ( // Only show tooltip if reply is long
                              <div className='absolute z-10 invisible group-hover:visible w-64 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                                <div className='whitespace-normal break-words'>
                                  {msg.aiReply}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {new Date(msg.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-4 text-center text-sm text-gray-500'
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
