'use client'
import { useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiCheckSquare,
  FiCalendar,
  FiUser,
  FiUsers
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { FiClock } from 'react-icons/fi'

interface User {
  _id: string
  phone: string
  name?: string
  isSupporter?: boolean
  type: string
}

interface ScheduledMessage {
  _id: string
  message: string
  users: string[]
  scheduledTime: string
  status: 'scheduled' | 'sent' | 'failed'
  hidden: boolean
  campaign: string
}

interface MessageTemplate {
  _id: string
  name: string
  content: string
  isActive: boolean
}

export default function MessageScheduler() {
  const [message, setMessage] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledMessages, setScheduledMessages] = useState<
    ScheduledMessage[]
  >([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [loading, setLoading] = useState({
    users: false,
    messages: false,
    sending: false
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [audience, setAudience] = useState<'all' | 'invitation' | 'contact'>('all')
  const [campaign, setCampaign] = useState('')
  const itemsPerPage = 10

  // Add this helper function to properly format the datetime for scheduling

  // Fetch users from API with filters
  const fetchUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }))
      const res = await fetch(
        `https://my-whatsapp-bot-6a9u.onrender.com/api/users`
      )
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(prev => ({ ...prev, users: false }))
    }
  }

  // Fetch scheduled messages from API
  const fetchScheduledMessages = async () => {
    try {
      setLoading(prev => ({ ...prev, messages: true }))
      const res = await fetch(
        'https://my-whatsapp-bot-6a9u.onrender.com/api/scheduled-messages'
      )
      const data = await res.json()

      // Filter to today's messages
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todaysMessages = data.filter((msg: ScheduledMessage) => {
        const msgDate = new Date(msg.scheduledTime)
        return msgDate >= today && msgDate < tomorrow
      })

      setScheduledMessages(todaysMessages)
    } catch (err) {
      console.error('Error fetching scheduled messages:', err)
      toast.error('Failed to load scheduled messages')
    } finally {
      setLoading(prev => ({ ...prev, messages: false }))
    }
  }

  useEffect(() => {
    fetchScheduledMessages()
  }, [])

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('https://my-whatsapp-bot-6a9u.onrender.com/api/templates')
        const data = await res.json()
        setTemplates(data || [])
      } catch (err) {
        toast.error('Failed to load templates')
      }
    }
    fetchTemplates()
  }, [])

  // When a template is selected, fill the message box
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t._id === selectedTemplateId)
      if (template) setMessage(template.content)
    }
  }, [selectedTemplateId, templates])

  useEffect(() => {
    fetchUsers()
  }, [recipientSearch, audience])

  // Add this function to set the current date/time in the input
  const setNow = () => {
    const now = new Date()
    // Format as yyyy-MM-ddTHH:mm for datetime-local input
    const pad = (n: number) => n.toString().padStart(2, '0')
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    setScheduledTime(formatted)
  }

  const handleUserToggle = (phone: string) => {
    setSelectedUsers(prev =>
      prev.includes(phone) ? prev.filter(u => u !== phone) : [...prev, phone]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredRecipients.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredRecipients.map(user => user.phone))
    }
  }

  const formatPhone = (phone: string) =>
    phone ? `+${phone.slice(0, 2)} ${phone.slice(2)}` : ''

  const handleSend = async () => {
    if (!message || selectedUsers.length === 0) {
      toast.error('Please enter a message and select recipients')
      return
    }

    try {
      setLoading(prev => ({ ...prev, sending: true }))
      const res = await fetch(
        'https://my-whatsapp-bot-6a9u.onrender.com/api/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            users: selectedUsers,
            scheduledTime: scheduledTime || undefined,
            audience,
            campaign: campaign || undefined
          })
        }
      )

      if (!res.ok) throw new Error('Failed to schedule message')

      toast.success('Message scheduled successfully!')
      setMessage('')
      setScheduledTime('')
      setSelectedUsers([])
      setCampaign('')
      fetchScheduledMessages() // Refresh the list
    } catch (err) {
      console.error(err)
      toast.error('Error scheduling message')
    } finally {
      setLoading(prev => ({ ...prev, sending: false }))
    }
  }

  const handleRefresh = () => {
    fetchScheduledMessages()
    fetchUsers()
  }
  const filteredRecipients = users.filter(user => {
    // Audience filter
    if (audience !== 'all' && user.type !== audience) {
      return false;
    }

    // Search filter
    if (recipientSearch) {
      const searchTerm = recipientSearch.toLowerCase();
      const phoneMatch = user.phone.toLowerCase().includes(searchTerm);
      const nameMatch = user.name && user.name.toLowerCase().includes(searchTerm);

      if (!phoneMatch && !nameMatch) {
        return false;
      }
    }

    return true;
  });
  // Pagination for scheduled messages
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentMessages = scheduledMessages.slice(
    indexOfFirstItem,
    indexOfLastItem
  )
  const totalPages = Math.ceil(scheduledMessages.length / itemsPerPage)

  return (
    <div className='space-y-6'>
      {/* Message Composer Section */}
      <div className='bg-white'>
        <h2 className='text-xl font-semibold p-4 border-b border-gray-200'>
          Schedule New Message
        </h2>

        <div className='p-2 space-y-4'>
          {/* Template Selector */}
          <div className=''>
            <h2 className='block mb-2 font-medium'>Select Template</h2>
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              <option value=''>-- Choose a template --</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message Content */}
          <div>
            <label className='block mb-2 font-medium'>Message Content</label>
            <textarea
              value={message}
              onChange={e => {
                setMessage(e.target.value)
                setSelectedTemplateId('') // Clear template selection if message is edited
              }}
              placeholder='Type your WhatsApp message here...'
              className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              rows={4}
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block mb-2 font-medium'>
                Schedule Time (Leave empty for immediate)
              </label>
              <div className="flex gap-2 flex-wrap">
                <input
                  type='datetime-local'
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  min={new Date().toISOString().slice(0, 16)}
                />
                <button
                  type="button"
                  onClick={setNow}
                  className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-blue-100"
                  title="Set to Now"
                >
                  <FiClock className="mr-1" /> Now
                </button>
              </div>
            </div>

            <div>
              <label className='block mb-2 font-medium'>
                Campaign Name (Optional)
              </label>
              <input
                type='text'
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
                placeholder='E.g. Election2024, FestivalGreetings'
                className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              />
            </div>
          </div>

          <div>
            <div className='flex justify-between items-center mb-2'>
              <label className='block font-medium'>Select Recipients</label>
              <div className='flex items-center gap-3 flex-wrap'>
                <select
                  value={audience}
                  onChange={e => setAudience(e.target.value as any)}
                  className='p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                >
                  <option value='all'>All Users</option>
                  <option value='contact'>Regular Contacts</option>
                  <option value='invitation'>Invitation Senders</option>
                </select>

                <div className='relative w-64'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <FiSearch className='text-gray-400' />
                  </div>
                  <input
                    type='text'
                    placeholder='Search recipients...'
                    className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    value={recipientSearch}
                    onChange={e => setRecipientSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className='mb-3'>
              <button
                onClick={handleSelectAll}
                disabled={filteredRecipients.length === 0}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition ${selectedUsers.length === filteredRecipients.length &&
                  filteredRecipients.length > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
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

            <div className='border rounded-lg p-3 h-64 overflow-y-auto'>
              {loading.users ? (
                <div className='flex justify-center items-center h-full'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                </div>
              ) : filteredRecipients.length > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2'>
                  {filteredRecipients.map(user => (
                    <div
                      key={user._id}
                      onClick={() => handleUserToggle(user.phone)}
                      className={`p-3 border rounded-lg cursor-pointer transition flex items-center gap-2 ${selectedUsers.includes(user.phone)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <div
                        className={`p-1 rounded-full ${selectedUsers.includes(user.phone)
                          ? 'text-blue-500'
                          : 'text-gray-400'
                          }`}
                      >
                        <FiUser />
                      </div>
                      <div>
                        <div className='font-medium'>
                          {user.name || 'No Name'}
                        </div>
                        <div className='text-sm text-gray-600'>
                          {formatPhone(user.phone)}
                        </div>
                        {user.isSupporter && (
                          <span className='text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full'>
                            Supporter
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-gray-500'>
                  <FiUsers className='text-3xl mb-2' />
                  <p>No recipients found</p>
                </div>
              )}
            </div>

            <div className='mt-2 text-sm text-gray-600'>
              Selected: {selectedUsers.length} recipients
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading.sending || !message || selectedUsers.length === 0}
            className='w-full md:w-auto px-6 bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading.sending ? (
              <span className='flex items-center justify-center gap-2'>
                <FiRefreshCw className='animate-spin' />
                {scheduledTime ? 'Scheduling...' : 'Sending...'}
              </span>
            ) : scheduledTime ? (
              'Schedule Message'
            ) : (
              'Send Now'
            )}
          </button>
        </div>
      </div>

      {/* Scheduled Messages List Section */}
      <div className='bg-white '>
        <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <h2 className='text-xl font-semibold text-gray-800 flex items-center gap-2'>
            <FiCalendar />
            Today's Scheduled Messages
          </h2>
          <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
            <div className='relative flex-1 sm:w-64'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <FiSearch className='text-gray-400' />
              </div>
              <input
                type='text'
                placeholder='Search messages...'
                className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              onClick={handleRefresh}
              disabled={loading.messages}
            >
              <FiRefreshCw
                className={`${loading.messages ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  S.No.
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Recipients
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Message
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Scheduled Time
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Campaign
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {loading.messages ? (
                <tr>
                  <td colSpan={6} className='px-6 py-4 text-center'>
                    <div className='flex justify-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                    </div>
                  </td>
                </tr>
              ) : currentMessages.length > 0 ? (
                currentMessages.map((msg, index) => (
                  <tr key={msg._id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='text-sm font-medium text-gray-900'>
                        {msg.users.length <= 2 ? (
                          msg.users.map(user => formatPhone(user)).join(', ')
                        ) : (
                          <div className='group relative'>
                            {`${formatPhone(msg.users[0])}, ${formatPhone(
                              msg.users[1]
                            )} +${msg.users.length - 2} more`}
                            <div className='absolute z-10 invisible group-hover:visible w-64 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg'>
                              {msg.users
                                .map(user => formatPhone(user))
                                .join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='text-sm text-gray-900 max-w-xs truncate group relative'>
                        {msg.message}
                        {msg.message.length > 50 && (
                          <div className='absolute z-10 invisible group-hover:visible w-64 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg'>
                            {msg.message}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {msg.scheduledTime
                        ? new Date(msg.scheduledTime).toLocaleString()
                        : 'Immediate'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${msg.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : msg.status === 'scheduled'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {msg.status}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {msg.campaign || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className='px-6 py-4 text-center text-sm text-gray-500'
                  >
                    No scheduled messages for today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {scheduledMessages.length > itemsPerPage && (
          <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
            <div className='text-sm text-gray-700'>
              Showing{' '}
              <span className='font-medium'>{indexOfFirstItem + 1}</span> to{' '}
              <span className='font-medium'>
                {Math.min(indexOfLastItem, scheduledMessages.length)}
              </span>{' '}
              of <span className='font-medium'>{scheduledMessages.length}</span>{' '}
              messages
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
      </div>
    </div>
  )
}
