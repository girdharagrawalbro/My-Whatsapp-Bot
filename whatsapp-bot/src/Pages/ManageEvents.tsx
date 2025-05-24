import { useEffect, useState } from 'react'
import {
  FiRefreshCw,
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiX
} from 'react-icons/fi'

interface Event {
  _id: string
  title: string
  date: string
  description: string
  organizer?: string
  contactPhone?:number
  address?: string
  mediaUrls?: string 
}

export default function ManageEvents () {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [filters, setFilters] = useState({
      date: '',
    })
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    organizer: ''
  })

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const res = await fetch('https://my-whatsapp-bot-6a9u.onrender.com/api/events')
        const data = await res.json()
        setEvents(data)
        setError(null)
      } catch (err) {
        setError('Failed to load events')
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const handleRefresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('https://my-whatsapp-bot-6a9u.onrender.com/api/events')
      const data = await res.json()
      setEvents(data)
      setError(null)
    } catch (err) {
      setError('Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('https://my-whatsapp-bot-6a9u.onrender.com/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        const newEvent = await res.json()
        setEvents([...events, newEvent])
        setShowAddForm(false)
        resetForm()
      }
    } catch (err) {
      setError('Failed to add event')
    }
  }

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentEvent) return
    try {
      const res = await fetch(`https://my-whatsapp-bot-6a9u.onrender.com/api/events/${currentEvent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        const updatedEvent = await res.json()
        setEvents(events.map(ev => (ev._id === updatedEvent._id ? updatedEvent : ev)))
        setShowEditForm(false)
        resetForm()
      }
    } catch (err) {
      setError('Failed to update event')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const res = await fetch(`https://my-whatsapp-bot-6a9u.onrender.com/api/events/${id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          setEvents(events.filter(ev => ev._id !== id))
        }
      } catch (err) {
        setError('Failed to delete event')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      organizer: ''
    })
  }

  const openEditForm = (event: Event) => {
    setCurrentEvent(event)
    setFormData({
      name: event.title,
      date: event.date.slice(0, 16), // for datetime-local input
      organizer: event.organizer || ''
    })
    setShowEditForm(true)
  }

    const applyFilters = (newFilters: Partial<typeof filters>) => {
    setFilters({ ...filters, ...newFilters })
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      date: '',
    })
  }

  // Filter and pagination logic
  const filteredEvents = events.filter(
    event => {
       const matchesSearch =
      (event.title && event.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.address && event.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.organizer && event.organizer.toLowerCase().includes(searchTerm.toLowerCase()))

       const matchesDate =
      !filters.date ||
      new Date(event.date).toDateString() ===
        new Date(filters.date).toDateString()

    return matchesSearch && matchesDate
})

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentEvents = filteredEvents.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)

  return (
    <div className='bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden m-6'>
      {/* Add Event Modal */}
      {showAddForm && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold'>Add New Event</h3>
              <button onClick={() => setShowAddForm(false)}>
                <FiX className='text-gray-500' />
              </button>
            </div>
            <form onSubmit={handleAddEvent}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Event Name*
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Date & Time*
                  </label>
                  <input
                    type='datetime-local'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Organizer
                  </label>
                  <textarea
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.organizer}
                    onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  />
                </div>
              </div>
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => setShowAddForm(false)}
                  className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditForm && currentEvent && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold'>Edit Event</h3>
              <button onClick={() => setShowEditForm(false)}>
                <FiX className='text-gray-500' />
              </button>
            </div>
            <form onSubmit={handleEditEvent}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Event Name*
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Date & Time*
                  </label>
                  <input
                    type='datetime-local'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Organizer
                  </label>
                  <textarea
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.organizer}
                    onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  />
                </div>
              </div>
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => setShowEditForm(false)}
                  className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Update Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <h2 className='text-lg font-semibold text-gray-800'>Event Management</h2>
        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
          <div className='relative flex-1 sm:w-64'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <FiSearch className='text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='Search events...'
              className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
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
          <button
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
            onClick={() => setShowAddForm(true)}
          >
            <FiPlus />
            <span>Add Event</span>
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
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    S.No.
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Description
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Date & Time
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Organizer
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Address
                  </th>

                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Contact
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Link
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {currentEvents.length > 0 ? (
                  currentEvents.map((event, index) => (
                    <tr key={event._id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='truncate'>{event.title}</div>
                          {event.title && event.title.length > 10 && (
                            <div className='absolute z-10 invisible group-hover:visible w-2 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                              <div className='whitespace-normal break-words'>
                                {event.title}
                              </div>
                            </div>
                          )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='truncate'>{event.description}</div>
                          {event.description && event.description.length > 10 && (
                            <div className='absolute z-10 invisible group-hover:visible w-2 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                              <div className='whitespace-normal break-words'>
                                {event.description}
                              </div>
                            </div>
                          )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {event.date ? new Date(event.date).toLocaleString() : ''}
                      </td>
                                            <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
                           <div className='truncate'>{event.organizer}</div>
                          {event.organizer && event.organizer.length > 10 && (
                            <div className='absolute z-10 invisible group-hover:visible w-2 p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                              <div className='whitespace-normal break-words'>
                                {event.organizer}
                              </div>
                            </div>
                          )}
                      </td>

                      <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
                        {event.address || 'N/A'}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
                        {event.contactPhone || 'N/A'}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
                        {event.mediaUrls || 'N/A'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                        <div className='flex space-x-2'>
                          <button
                            onClick={() => openEditForm(event)}
                            className='text-indigo-600 hover:text-indigo-900'
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event._id)}
                            className='text-red-600 hover:text-red-900'
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className='px-6 py-4 text-center text-sm text-gray-500'
                    >
                      No events found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredEvents.length > itemsPerPage && (
            <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
              <div className='text-sm text-gray-700'>
                Showing{' '}
                <span className='font-medium'>{indexOfFirstItem + 1}</span> to{' '}
                <span className='font-medium'>
                  {Math.min(indexOfLastItem, filteredEvents.length)}
                </span>{' '}
                of <span className='font-medium'>{filteredEvents.length}</span>{' '}
                events
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
