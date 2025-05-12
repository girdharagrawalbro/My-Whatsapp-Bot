// WhatsAppScheduler.tsx
import { useState } from 'react'

export default function WhatsAppScheduler () {
  const [message, setMessage] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const dummyUsers = ['+911111111111', '+922222222222', '+933333333333']

  const handleUserToggle = (user: string) => {
    setSelectedUsers(prev =>
      prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]
    )
  }

  const handleSend = () => {
    if (!message || selectedUsers.length === 0) {
      alert('Please enter a message and select users.')
      return
    }

    // Here you would send the message using WhatsApp Business API (Facebook Developer)
    console.log('Sending message:', {
      to: selectedUsers,
      message,
      scheduledTime
    })

    alert('Message scheduled or sent!')
    setMessage('')
    setScheduledTime('')
    setSelectedUsers([])
  }

  return (
    <div className='max-w-xl mx-auto'>
      <h1 className='text-2xl font-bold mb-4'>WhatsApp Message Scheduler</h1>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder='Enter message'
        className='w-full p-2 border rounded mb-4'
        rows={4}
      />

      <label className='block mb-2 font-medium'>Schedule Time (Optional)</label>
      <input
        type='datetime-local'
        value={scheduledTime}
        onChange={e => setScheduledTime(e.target.value)}
        className='w-full p-2 border rounded mb-4'
      />

      <label className='block mb-2 font-medium'>Select Users</label>
      <div className='flex flex-wrap gap-2 mb-4'>
        {dummyUsers.map(user => (
          <button
            key={user}
            onClick={() => handleUserToggle(user)}
            className={`px-3 py-1 border rounded ${
              selectedUsers.includes(user)
                ? 'bg-green-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            {user}
          </button>
        ))}
      </div>

      <button
        onClick={handleSend}
        className='w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700'
      >
        Send / Schedule
      </button>
    </div>
  )
}
