import { useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi'

interface UserMessage {
  _id: string
  user: {
    phone: string
  }
  text: string
  aiReply: string
  timestamp: string
  status: 'pending' | 'replied' | 'error'
}

export default function ManageUsers () {
  const [users, setUsers] = useState<UserMessage[]>([])
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

        // Process data to get last message per user
        const userMap = new Map<string, UserMessage>()

        data.forEach((msg: UserMessage) => {
          const phone = msg.user.phone
          const existingMsg = userMap.get(phone)

          if (
            !existingMsg ||
            new Date(msg.timestamp) > new Date(existingMsg.timestamp)
          ) {
            userMap.set(phone, msg)
          }
        })

        // Convert map values to array and sort by timestamp (newest first)
        const uniqueUsers = Array.from(userMap.values()).sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        setUsers(uniqueUsers)
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

  const filteredUsers = users.filter(user => {
    const phone = user.user.phone?.toLowerCase() || ''
    const text = user.text?.toLowerCase() || ''
    const searchTermLower = searchTerm.toLowerCase()

    return phone.includes(searchTermLower) || text.includes(searchTermLower)
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  return (
    <div className='bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden m-6'>
      <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <h2 className='text-lg font-semibold text-gray-800'>User Messages</h2>
        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
          <div className='relative flex-1 sm:w-64'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <FiSearch className='text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='Search users or messages...'
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
        <div className='text-red-500 p-4 text-center'>{error}</div>
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
                    Phone Number
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Last Message
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Status
                  </th>
                  <th
                    scope='col'
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {currentUsers.length > 0 ? (
                  currentUsers.map((user, index) => (
                    <tr key={user._id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900'>
                          {user.user.phone
                            ? `+${user.user.phone.slice(
                                0,
                                2
                              )} ${user.user.phone.slice(2)}`
                            : 'N/A'}
                        </div>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
                        {user.text}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'replied'
                              ? 'bg-green-100 text-green-800'
                              : user.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {new Date(user.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className='px-6 py-4 text-center text-sm text-gray-500'
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
              <div className='text-sm text-gray-700'>
                Showing{' '}
                <span className='font-medium'>{indexOfFirstItem + 1}</span> to{' '}
                <span className='font-medium'>
                  {Math.min(indexOfLastItem, filteredUsers.length)}
                </span>{' '}
                of <span className='font-medium'>{filteredUsers.length}</span>{' '}
                users
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
