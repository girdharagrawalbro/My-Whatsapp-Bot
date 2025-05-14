import StatsCard from '../components/StatsCard'
import { useState, useEffect } from 'react'

// Define the Message interface
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

export default function Dashboard () {
  // Add type definition for stats
  interface StatItem {
    title: string
    value: string
    change: string
    trend: 'up' | 'down'
  }

  const [todaysMessages, setTodaysMessages] = useState<Message[]>([])
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [newUsersToday, setNewUsersToday] = useState<number>(0)
  const [failedMessages, setFailedMessages] = useState<number>(0)
  const [yesterdaysMessagesCount, setYesterdaysMessagesCount] = useState(0)
  const [yesterdaysUserCount, setYesterdaysUserCount] = useState(0)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/messages')
        const data: Message[] = await response.json()
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]

        const yesterday = new Date() // Create a new Date instance
        yesterday.setDate(today.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        const filteredMessages = data.filter(message => {
          const messageDate = new Date(message.timestamp)
            .toISOString()
            .split('T')[0]
          return messageDate === todayStr
        })

        const oldMessages = data.filter(message => {
          const messageDate = new Date(message.timestamp)
            .toISOString()
            .split('T')[0]
          return messageDate < todayStr
        })
        setTodaysMessages(filteredMessages)

        // Get unique users
        const allUsers = new Set(data.map(message => message.user.phone))
        const todaysUsers = new Set(
          filteredMessages.map(message => message.user.phone)
        )
        const yesterdaysUsers = new Set(
          oldMessages.map(message => message.user.phone)
        )
        const yesterdaysmessages = data.filter(
          (message: Message) => message.timestamp.split('T')[0] === yesterdayStr
        )

        const failedToday = filteredMessages.filter(
          message => message.status === 'error' || 'pending'
        )

        setTotalUsers(allUsers.size)
        setNewUsersToday(todaysUsers.size)
        setFailedMessages(failedToday.length)
        setYesterdaysMessagesCount(yesterdaysmessages.length)
        setYesterdaysUserCount(yesterdaysUsers.size)
      } catch (error) {
        console.error('Failed to fetch messages', error)
      }
    }

    fetchMessages()
  }, [])
  const calcChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return '100%'
    return `${(((today - yesterday) / yesterday) * 100).toFixed(1)}%`
  }

  const calcTrend = (today: number, yesterday: number) => {
    return today >= yesterday ? 'up' : 'down'
  }

  const stats: StatItem[] = [
    {
      title: 'New Users',
      value: `${newUsersToday}`,
      change: calcChange(newUsersToday, yesterdaysUserCount),
      trend: calcTrend(newUsersToday, yesterdaysUserCount)
    },
    {
      title: 'New Messages',
      value: `${todaysMessages.length}`,
      change: calcChange(todaysMessages.length, yesterdaysMessagesCount),
      trend: calcTrend(todaysMessages.length, yesterdaysMessagesCount)
    },
    {
      title: 'Total Users',
      value: `${totalUsers}`,
      change: calcChange(totalUsers, totalUsers - newUsersToday),
      trend: calcTrend(totalUsers, totalUsers - newUsersToday)
    },
    {
      title: 'Not Replied Messages',
      value: `${failedMessages}`,
      change: '',
      trend: 'up'
    }
  ]

  return (
    <div className='flex bg-gray-50'>
      <main className='flex-1 overflow-y-auto p-3 sm:p-6 scrollbar-hide'>
        <div className='mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center'>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0'>
            Dashboard Overview
          </h1>
          <div className='text-xs sm:text-sm text-gray-500'>
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6'>
          {stats.map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
            />
          ))}
        </div>

        {/* Recent Activity */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6 mb-4 sm:mb-6'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4'>
            <h2 className='text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-0'>
              Recent Activity
            </h2>
            <button className='text-xs sm:text-sm text-indigo-600 hover:text-indigo-800'>
              View All
            </button>
          </div>
          {/* Activity timeline would go here */}
          <div className='text-center py-4 sm:py-8 text-gray-500 text-sm'>
            Activity timeline component would go here
          </div>
        </div>

        {/* Today's Messages in Table Format */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6'>
          <h2 className='text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4'>
            Today's Messages
          </h2>
          {todaysMessages.length > 0 ? (
            <div className='overflow-x-auto -mx-3 sm:mx-0'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      No.
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      From
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Text
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Reply
                    </th>

                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {todaysMessages.map((message, index) => (
                    <tr key={message._id} className='hover:bg-gray-50'>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500'>
                        {index + 1}
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap'>
                        <div className='text-xs sm:text-sm font-medium text-gray-900'>
                          {message.user.phone
                            ? `+${message.user.phone.slice(
                                0,
                                2
                              )} ${message.user.phone.slice(2)}`
                            : ''}
                        </div>
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 max-w-[100px] sm:max-w-xs truncate'>
                        {message.text}
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 max-w-[100px] sm:max-w-xs truncate'>
                        {!message.aiReply?.trim() ? (
                          <span
                            className={`px-2 py-1 rounded-full ${
                              message.status === 'pending'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {message.status}
                          </span>
                        ) : (
                          message.aiReply
                        )}
                      </td>

                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500'>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='text-gray-500 text-sm'>
              No messages found for today.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
