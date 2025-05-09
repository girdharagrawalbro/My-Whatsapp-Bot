import { useState, useEffect } from 'react'

interface Message {
  _id: string
  from: string
  text: string
  aiReply: string
  timestamp: string
}

export default function MessageHistory () {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('http://localhost:3000/api/messages')
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }
      const data = await response.json()
      setMessages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const handleRefresh = () => {
    fetchMessages()
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Message History</h1>

      <button
        onClick={handleRefresh}
        disabled={loading}
        className='mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300'
      >
        {loading ? 'Refreshing...' : 'Refresh Messages'}
      </button>

      {error && (
        <div className='mb-4 p-2 bg-red-100 text-red-700 rounded'>
          Error: {error}
        </div>
      )}

      {loading && messages.length === 0 ? (
        <div>Loading messages...</div>
      ) : (
        <div className='overflow-x-auto text-black'>
          <table className='min-w-full bg-white border border-gray-200'>
            <thead>
              <tr className='bg-black text-white'>
                <th className='py-2 px-4 border-b text-left'>S. No.</th>
                <th className='py-2 px-4 border-b text-left'>From</th>
                <th className='py-2 px-4 border-b text-left'>Text</th>
                <th className='py-2 px-4 border-b text-left'>Replay</th>
                <th className='py-2 px-4 border-b text-left'>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {messages.length > 0 ? (
                messages.map(message => (
                  <tr key={message._id} className='hover:bg-gray-50'>
                    <td className='py-2 px-4 border-b'>#</td>
                    <td className='py-2 px-4 border-b'>{message.from}</td>
                    <td className='py-2 px-4 border-b'>{message.text}</td>
                    <td className='py-2 px-4 border-b'>{message.aiReply}</td>
                    <td className='py-2 px-4 border-b'>
                      {new Date(message.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className='py-4 text-center text-gray-500'>
                    No messages found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
