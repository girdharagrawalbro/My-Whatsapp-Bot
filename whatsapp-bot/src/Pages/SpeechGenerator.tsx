'use client'
import { useEffect, useState, useRef } from 'react'
import {
  FiMic,
  FiSend,
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiCheckSquare,
  FiVolume2,
  FiStopCircle
} from 'react-icons/fi'
import { GoogleGenerativeAI } from '@google/generative-ai'
import toast from 'react-hot-toast'

export default function SpeechGenerator () {
  const [text, setText] = useState('')
  const [generatedSpeech, setGeneratedSpeech] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('hindi')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [audioURL, setAudioURL] = useState('')
  const itemsPerPage = 10

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang =
          selectedLanguage === 'hindi' ? 'hi-IN' : 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setText(prev => prev + ' ' + transcript)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [selectedLanguage])

  const languages = [
    { id: 'hindi', name: 'Hindi' },
    { id: 'english', name: 'English' },
    { id: 'hinglish', name: 'Hinglish' }
  ]

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/messages')
        const data = await res.json()
        const phoneSet = new Set(data.map((da: any) => da.user.phone))
        setUsers(Array.from(phoneSet))
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }

    fetchUsers()
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

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        toast.error('Error accessing microphone. Please check permissions.')
      }
    } else {
      toast.error('Speech recognition not supported in your browser')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const generateSpeech = async () => {
    if (!text) {
      toast.error('Please enter some text to generate speech')
      return
    }

    try {
      setLoading(true)
      setGeneratedSpeech('')
      setAudioURL('')

      // Initialize Gemini API
      const genAI = new GoogleGenerativeAI(
        'AIzaSyDo0eD4kH-FMGIa6mrr29TodxlqB5RFfzk'
      )
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Generate text response (simulating speech generation)
      const prompt = `Generate a natural sounding ${selectedLanguage} speech for a political and social leader from the following context:\n\n${text} (give direct speech without heading a subheading)`
      const result = await model.generateContent(prompt)
      const response = await result.response
      const generatedText = response.text()

      setGeneratedSpeech(generatedText)

      // In a real implementation, you would:
      // 1. Send the text to a TTS API
      // 2. Get back audio data
      // 3. Create an audio URL for playback

      // Mock implementation - in production use a real TTS service
      //   const mockAudioBlob = new Blob([], { type: 'audio/mpeg' })
      //   const mockAudioURL = URL.createObjectURL(mockAudioBlob)
      //   setAudioURL(mockAudioURL)
    } catch (err) {
      console.error('Error generating speech:', err)
      toast.error('Failed to generate speech')
    } finally {
      setLoading(false)
    }
  }

  const sendToChat = async () => {
    if (!generatedSpeech || selectedUsers.length === 0) {
      toast.error('Please generate speech and select recipients')
      return
    }

    try {
      // In a real app, you would call your WhatsApp API here
      const res = await fetch('http://localhost:3000/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: generatedSpeech,
          users: selectedUsers
        })
      })

      if (!res.ok) throw new Error('Failed to send message')

      toast.success('Message sent successfully!')
      setGeneratedSpeech('')
      setSelectedUsers([])
      setAudioURL('')
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error('Failed to send message')
    }
  }

  // Filter recipients based on search term
  const filteredRecipients = users.filter(user =>
    user.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination for recipients
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentRecipients = filteredRecipients.slice(
    indexOfFirstItem,
    indexOfLastItem
  )
  const totalPages = Math.ceil(filteredRecipients.length / itemsPerPage)

  return (
    <div className='bg-white rounded-lg border border-gray-200 shadow-sm m-6'>
      <h2 className='text-xl font-semibold p-4 border-b border-gray-200'>
        Speech Generator
      </h2>

      <div className='px-6 py-4'>
        {/* Text Input Section */}
        <div className='mb-6'>
          <label className='block mb-2 font-medium'>Enter Text</label>
          <div className='flex gap-2'>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder='Type or speak your message...'
              className='w-full p-3 border border-gray-300 rounded-lg'
              rows={4}
            />
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 h-fit rounded-lg border ${
                isListening
                  ? 'bg-red-100 border-red-300 text-red-600'
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {isListening ? (
                <FiStopCircle className='text-lg' />
              ) : (
                <FiMic className='text-lg' />
              )}
            </button>
          </div>
          {isListening && (
            <div className='mt-2 text-sm text-blue-600 flex items-center'>
              <div className='w-2 h-2 rounded-full bg-blue-600 mr-2 animate-pulse'></div>
              Listening...
            </div>
          )}
        </div>

        {/* Voice and Language Selection */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
          <div>
            <label className='block mb-2 font-medium'>Select Language</label>
            <div className='flex gap-2 flex-wrap'>
              {languages.map(language => (
                <button
                  key={language.id}
                  onClick={() => setSelectedLanguage(language.id)}
                  className={`px-4 py-2 border rounded-full text-sm ${
                    selectedLanguage === language.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {language.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className='mb-6'>
          <button
            onClick={generateSpeech}
            disabled={loading || !text}
            className='px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
          >
            {loading ? <FiRefreshCw className='animate-spin' /> : <FiVolume2 />}
            <span>Generate Speech</span>
          </button>
        </div>

        {/* Generated Speech Preview */}
        {generatedSpeech && (
          <div className='mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200'>
            <h3 className='font-medium mb-2'>Generated Speech</h3>
            <p className='whitespace-pre-line mb-3'>{generatedSpeech}</p>
            {audioURL && (
              <audio ref={audioRef} controls className='w-full mt-3'>
                <source src={audioURL} type='audio/mpeg' />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        )}

        {/* Recipient Selection */}
        <div className='mb-6'>
          <div className='flex justify-between items-center mb-2'>
            <label className='block font-medium'>Select Recipients</label>
            <div className='relative w-64'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <FiSearch className='text-gray-400' />
              </div>
              <input
                type='text'
                placeholder='Search recipients...'
                className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className='mb-3'>
            <button
              onClick={handleSelectAll}
              className={`flex items-center gap-2 text-sm border border-gray-300 px-4 py-2 rounded-lg transition ${
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

          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6     gap-2 max-h-60 overflow-y-auto p-2'>
            {currentRecipients.map(phone => (
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

          {/* Pagination for recipients */}
          {filteredRecipients.length > itemsPerPage && (
            <div className='mt-3 flex justify-between items-center'>
              <span className='text-sm text-gray-600'>
                Showing {indexOfFirstItem + 1}-
                {Math.min(indexOfLastItem, filteredRecipients.length)} of{' '}
                {filteredRecipients.length}
              </span>
              <div className='flex gap-2'>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className='p-1 border border-gray-300 rounded disabled:opacity-50'
                >
                  <FiChevronLeft />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(prev => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className='p-1 border border-gray-300 rounded disabled:opacity-50'
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={sendToChat}
          disabled={!generatedSpeech || selectedUsers.length === 0}
          className='px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
        >
          <FiSend />
          <span>Send to Chat</span>
        </button>
      </div>
    </div>
  )
}
