import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx';
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
import toast from 'react-hot-toast';

interface Event {
  _id: string
  title: string
  date: string
  time: string
  description: string
  organizer?: string
  contactPhone?: string
  address?: string
  mediaUrls?: string
  isAttended?: boolean
}

export default function ManageEvents() {
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
    title: '',
    description: '',
    date: '',
    time: '',
    organizer: '',
    contactPhone: '',
    address: '',
    mediaUrls: '',
    isAttended: false
  })

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const res = await fetch('https://my-whatsapp-bot-sqc6.onrender.com/api/events')
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
      const res = await fetch('https://my-whatsapp-bot-sqc6.onrender.com/api/events')
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
      const res = await fetch('https://my-whatsapp-bot-sqc6.onrender.com/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        toast.success("Succesfully Added")
        const newEvent = await res.json()
        setEvents([...events, newEvent])
        setShowAddForm(false)
        resetForm()
      }
    } catch (err) {
      setError('Failed to add event')
      toast.error('Failed to add event')

    }
  }

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentEvent) return
    try {
      const res = await fetch(`https://my-whatsapp-bot-sqc6.onrender.com/api/events/${currentEvent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        toast.success("Succesfully Updated")
        const updatedEvent = await res.json()
        setEvents(events.map(ev => (ev._id === updatedEvent._id ? updatedEvent : ev)))
        setShowEditForm(false)
        resetForm()
      }
    } catch (err) {
      setError('Failed to update event')
      toast.error('Failed to update event')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const res = await fetch(`https://my-whatsapp-bot-sqc6.onrender.com/api/events/${id}`, {
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
      title: '',
      description: '',
      date: '',
      time: '',
      organizer: '',
      contactPhone: '',
      address: '',
      mediaUrls: '',
      isAttended: false
    })
  }

  const openEditForm = (event: Event) => {
    setCurrentEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time,
      organizer: event.organizer || '',
      contactPhone: event.contactPhone || '',
      address: event.address || '',
      mediaUrls: event.mediaUrls || '',
      isAttended: event.isAttended ?? false,
    });

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

  const exportPDF = async () => {
    if (!filteredEvents || filteredEvents.length === 0) {
      toast.error("No data to make PDF");
      return;
    }

    toast.promise(
      fetch('http://localhost:3000/api/makePdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: filteredEvents,
          date: filters.date
        })
      }).then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate PDF');
        }

        // If success, open the generated PDF link
        window.open(data.link, '_blank');
        return data;
      }),
      {
        loading: 'Generating PDF...',
        success: <b>PDF generated successfully!</b>,
        error: (err) => <b>{err.message || 'Could not generate PDF.'}</b>,
      }
    );
  };


  // Excel Export handler
  const exportExcel = () => {
    const worksheetData = [
      ["S.No.", "Name", "Description", "Date & Time", "Organizer", "Address", "Contact", "Link"],
      ...currentEvents.map((event, index) => [
        indexOfFirstItem + index + 1,
        event.title,
        event.description,
        event.date ? `${new Date(event.date).toLocaleDateString()} ${event.time}` : '',
        event.organizer,
        event.address,
        event.contactPhone,
        event.mediaUrls || ''
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Events");

    XLSX.writeFile(workbook, "events.xlsx");
  };

  return (
    <div className='bg-white h-screen overflow-scroll'>
      {/* Add Event Modal */}
      {showAddForm && (
        <div className='fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg py-2 px-4 w-full max-w-md border shadow-lg border-gray-300'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold'>Add New Event</h3>
              <button onClick={() => setShowAddForm(false)}>
                <FiX className='text-gray-500' />
              </button>
            </div>
            <form onSubmit={handleAddEvent}>
              <div className='space-y-1'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Event Title<span className='text-red-700'>*</span>
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Description
                  </label>
                  <input
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Date
                    </label>
                    <input
                      type='date'
                      className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Time
                    </label>
                    <input
                      type='time'
                      className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Organizer
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.organizer}
                    onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Contact Phone
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Address
                  </label>
                  <input
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
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
        <div className='fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg py-2 px-4 w-full max-w-md border shadow-lg border-gray-300'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold'>Edit Event</h3>
              <button onClick={() => setShowEditForm(false)}>
                <FiX className='text-gray-500' />
              </button>
            </div>
            <form onSubmit={handleEditEvent}>
              <div className='space-y-1'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Event Title<span className='text-red-700'>*</span>
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Description
                  </label>
                  <input
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Date
                    </label>
                    <input
                      type='date'
                      className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Time
                    </label>
                    <input
                      type='time'
                      className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Organizer
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.organizer}
                    onChange={e => setFormData({ ...formData, organizer: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Contact Phone
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Address
                  </label>
                  <input
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Media URL
                  </label>
                  <input
                    type='url'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.mediaUrls}
                    onChange={e => setFormData({ ...formData, mediaUrls: e.target.value })}
                  />
                </div>
                <div className='flex gap-2 items-center'>
                  <label className='block w-28 text-sm font-medium text-gray-700'>
                    Attended?
                  </label>
                  <select
                    name="isattended"
                    id="isattended"
                    value={formData.isAttended?.toString()}  // convert boolean to string
                    onChange={e =>
                      setFormData({ ...formData, isAttended: e.target.value === 'true' })
                    }
                    className='mt-1 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 px-1 py-2'
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>


              </div>
              <div className='mt-2 flex justify-end space-x-3'>
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

      {/* Rest of your component remains the same */}
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
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export Excel
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
          <div className='overflow-x-auto h-screen' id="print-section">
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    S.No.
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Name
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Description
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Date & Time
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Organizer
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Contact Phone
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Address
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Link
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Attedned
                  </th>
                  <th className='px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y text-center divide-gray-200'>
                {currentEvents.length > 0 ? (
                  currentEvents.map((event, index) => (
                    <tr key={event._id} className='hover:bg-gray-50'>
                      <td className='px-2 py-4 whitespace-nowrap text-sm text-gray-500 text-center'>
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap w-28 relative group">
                        <div className="truncate max-w-[10rem]">{event.title}</div>
                        {event.title && event.title.length > 10 && (
                          <div className="absolute z-10 invisible group-hover:visible max-w-xs p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            <div className="whitespace-normal break-words">
                              {event.title}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap w-28 relative group">
                        <div className="truncate max-w-[10rem]">{event.description}</div>
                        {event.description && event.description.length > 10 && (
                          <div className="absolute z-10 invisible group-hover:visible max-w-xs p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            <div className="whitespace-normal break-words">
                              {event.description}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.date ? (
                          <div className="flex flex-col">
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-400">{event.time}</span>
                          </div>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap w-28 relative group">
                        <div className="truncate max-w-[10rem]">{event.organizer}</div>
                        {event.organizer && event.organizer.length > 20 && (
                          <div className="absolute z-10 invisible group-hover:visible max-w-xs p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            <div className="whitespace-normal break-words">
                              {event.organizer}
                            </div>
                          </div>
                        )}

                      </td>
                      <td className="px-2 py-4 whitespace-nowrap relative group">

                        {event.contactPhone ? (
                          <div className="flex flex-col truncate max-w-[8rem]">
                            {event.contactPhone.split(',').map((phone, idx) => (
                              <span key={idx} className="truncate">
                                {phone.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          ''
                        )}
                        {event.contactPhone && event.contactPhone.length > 15 && (
                          <div className="absolute z-10 invisible group-hover:visible max-w-xs p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            <div className="whitespace-normal break-words">
                              {event.contactPhone.split(',').map((phone, idx) => (
                                <div key={idx}>{phone.trim()}</div>
                              ))}
                            </div>
                          </div>
                        )}

                      </td>
                      <td className="px-2 py-4 whitespace-nowrap w-28 relative group">
                        <div className="truncate max-w-[10rem]">{event.address}</div>
                        {event.address && event.address.length > 20 && (
                          <div className="absolute z-10 invisible group-hover:visible max-w-xs p-3 mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            <div className="whitespace-normal break-words">
                              {event.address}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-4 text-sm text-gray-500  text-center">
                        <div className="flex justify-center items-center gap-2">
                          {event.mediaUrls && (
                            <a
                              href={event.mediaUrls}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 text-lg"
                              title="Open media link"
                            >
                              🔗
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-sm text-gray-500  text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${event.isAttended
                            ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {
                            event.isAttended ? "Yes" : "No"
                          }
                        </span></td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => openEditForm(event)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
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
                      colSpan={9}
                      className='px-2 py-4 text-center text-sm text-gray-500'
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
            <div className='px-12 py-4 border-t border-gray-200 flex items-center justify-between'>
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