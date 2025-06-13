import StatsCard from '../components/StatsCard'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Event {
  _id: string
  title: string
  date: string
  time: string
  address: string
  isAttended: boolean
}

interface User {
  phone: string
  name?: string
  lastInteraction: string
}
``
export default function Dashboard() {
  interface StatItem {
    title: string
    value: string
    change: string
    trend: 'up' | 'down'
  }

  const [todaysEvents, setTodaysEvents] = useState<Event[]>([])
  const [totalEvents, setTotalEvents] = useState<number>(0)
  const [newUsersToday, setNewUsersToday] = useState<number>(0)
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [yesterdaysEventsCount, setYesterdaysEventsCount] = useState(0)
  const [yesterdaysUserCount, setYesterdaysUserCount] = useState(0)
  const [todaysUsers, setTodaysUsers] = useState<User[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, usersRes] = await Promise.all([
          fetch('https://my-whatsapp-bot-sqc6.onrender.com/api/events'),
          fetch('https://my-whatsapp-bot-sqc6.onrender.com/api/users')
        ])

        const eventsData: Event[] = await eventsRes.json()
        const usersData: User[] = await usersRes.json()

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Filter today's events
        const filteredEvents = eventsData.filter(event => {
          const eventDate = new Date(event.date)
          return eventDate >= today && eventDate < tomorrow
        })

        // Filter today's users
        const filteredUsers = usersData.filter(user => {
          const userDate = new Date(user.lastInteraction)
          return userDate >= today
        })

        // Get yesterday's data for comparison
        const yesterday = new Date()
        yesterday.setDate(today.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const yesterdayStart = new Date(yesterday)
        yesterday.setHours(23, 59, 59, 999)

        const yesterdaysEvents = eventsData.filter(event => {
          const eventDate = new Date(event.date)
          return eventDate >= yesterdayStart && eventDate < today
        })

        const yesterdaysUsers = usersData.filter(user => {
          const userDate = new Date(user.lastInteraction)
          return userDate >= yesterdayStart && userDate < today
        })

        setTodaysEvents(filteredEvents)
        setTotalEvents(eventsData.length)
        setNewUsersToday(filteredUsers.length)
        setTotalUsers(usersData.length)
        setYesterdaysEventsCount(yesterdaysEvents.length)
        setYesterdaysUserCount(yesterdaysUsers.length)
        setTodaysUsers(filteredUsers)

      } catch (error) {
        toast.error('Error in fetching dashboard data')
        console.error('Failed to fetch dashboard data', error)
      }
    }

    fetchData()
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
      title: "Today's Events",
      value: todaysEvents.length.toString(),
      change: calcChange(todaysEvents.length, yesterdaysEventsCount),
      trend: calcTrend(todaysEvents.length, yesterdaysEventsCount)
    },
    {
      title: "New Users Today",
      value: newUsersToday.toString(),
      change: calcChange(newUsersToday, yesterdaysUserCount),
      trend: calcTrend(newUsersToday, yesterdaysUserCount)
    },
    {
      title: "Total Events",
      value: totalEvents.toString(),
      change: "",
      trend: "up"
    },
    {
      title: "Total Users",
      value: totalUsers.toString(),
      change: calcChange(totalUsers, totalUsers - newUsersToday),
      trend: calcTrend(totalUsers, totalUsers - newUsersToday)
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

        {/* Today's Events Section */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6 mb-4 sm:mb-6'>
          <h2 className='text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4'>
            Today's Scheduled Events
          </h2>
          {todaysEvents.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Event
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Time
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Location
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Attended
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {todaysEvents.map((event) => (
                    <tr key={event._id} className='hover:bg-gray-50'>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900'>{event.title}</div>
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-500'>{event.time || 'Not specified'}</div>
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-500'>{event.address || 'Not specified'}</div>
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center'>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${event.isAttended
                            ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {
                            event.isAttended ? "Yes" : "No"
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='text-center text-gray-500 text-sm py-10'>
              No events scheduled for today.
            </div>
          )}
        </div>

        {/* New Users Section */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6'>
          <h2 className='text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4'>
            New Users Today
          </h2>
          {todaysUsers.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Phone
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Name
                    </th>
                    <th className='px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Last Interaction
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {todaysUsers.map((user) => (
                    <tr key={user.phone} className='hover:bg-gray-50'>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900'>
                          {user.phone ? `+${user.phone.slice(0, 2)} ${user.phone.slice(2)}` : ''}
                        </div>
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-500'>{user.name || 'Not provided'}</div>
                      </td>
                      <td className='px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-500'>
                          {new Date(user.lastInteraction).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='text-center text-gray-500 text-sm py-10'>
              No new users registered today.
            </div>
          )}
        </div>
      </main >
    </div >
  )
}