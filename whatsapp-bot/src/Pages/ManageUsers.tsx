import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
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

interface User {
  _id: string
  phone: string
  name?: string
  type: string
  lastInteraction?: string
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    type: ''
  })
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch users
        const usersRes = await fetch(
          'http://localhost:3000/api/users'
        )
        const usersData = await usersRes.json()
        setUsers(usersData)


        setError(null)
      } catch (err) {
        setError('Failed to load users')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleRefresh = async () => {
    try {
      setLoading(true)

      // Fetch users
      const usersRes = await fetch(
        'http://localhost:3000/api/users'
      )
      const usersData = await usersRes.json()
      setUsers(usersData)

      setError(null)
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(
        'http://localhost:3000/api/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData
          })
        }
      )

      if (res.ok) {
        toast.success("New User Added");
        const newUser = await res.json()
        setUsers([...users, newUser])
        setShowAddForm(false)
        resetForm()
      }
    } catch (err) {
      setError('Failed to add user')
      toast.error('Failed to add user')
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      const res = await fetch(
        `http://localhost:3000/api/users/${currentUser._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData
          })
        }
      )

      if (res.ok) {
        toast.success("User Details Updated");
        const updatedUser = await res.json()
        setUsers(users.map(u => (u._id === updatedUser._id ? updatedUser : u)))
        setShowEditForm(false)
        resetForm()
      }
    } catch (err) {
      setError('Failed to update user')
      toast.error('Failed to update user')
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const res = await fetch(
          `http://localhost:3000/api/users/${id}`,
          {
            method: 'DELETE'
          }
        )

        if (res.ok) {
          setUsers(users.filter(u => u._id !== id))
        }
      } catch (err) {
        setError('Failed to delete user')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      phone: '',
      name: '',
      type: ''
    })
  }

  const openEditForm = (user: User) => {
    setCurrentUser(user)
    setFormData({
      phone: user.phone,
      name: user.name || '',
      type: user.type || 'contact'
    })
    setShowEditForm(true)
  }



  // Filter and pagination logic
  const filteredUsers = users.filter(
    user =>
      user.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  return (
    <div className='bg-white  overflow-scroll '>
      {/* Add User Modal */}
      {showAddForm && (
        <div className='fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md border shadow-lg border-gray-300'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold'>Add New User</h3>
              <button onClick={() => setShowAddForm(false)}>
                <FiX className='text-gray-500' />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Phone Number*
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.phone}
                    onChange={e =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Name
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Type
                  </label>
                  <select name="type" id="type" value={formData.type}
                    onChange={e => setFormData(e.target.value as any)}>
                    <option value="contact">Contacted User</option>
                    <option value="invitation">Invitaion User</option>
                  </select>
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
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }

      {/* Edit User Modal */}
      {
        showEditForm && currentUser && (
          <div className='fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 w-full max-w-md border shadow-lg border-gray-300'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='text-lg font-semibold'>Edit User</h3>
                <button onClick={() => setShowEditForm(false)}>
                  <FiX className='text-gray-500' />
                </button>
              </div>
              <form onSubmit={handleEditUser}>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Phone Number*
                    </label>
                    <input
                      type='text'
                      className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      value={formData.phone}
                      onChange={e =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Name
                    </label>
                    <input
                      type='text'
                      className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Type
                    </label>
                    <select name="type" id="type" value={formData.type}
                      onChange={e => setFormData(e.target.value as any)}>
                      <option value="contact">Contacted User</option>
                      <option value="invitation">Invitaion User</option>
                    </select>
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
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Main Content */}
      <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <h2 className='text-lg font-semibold text-gray-800'>User Management</h2>
        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
          <div className='relative flex-1 sm:w-64'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <FiSearch className='text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='Search users...'
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
          <button
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
            onClick={() => setShowAddForm(true)}
          >
            <FiPlus />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {
        error ? (
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
                      Phone
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Name
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Type
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Last Interaction
                    </th>

                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user, index) => {
                      return (
                        <tr key={user._id} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {indexOfFirstItem + index + 1}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='text-sm font-medium text-gray-900'>
                              {user.phone
                                ? `+${user.phone.slice(0, 2)} ${user.phone.slice(
                                  2
                                )}`
                                : 'N/A'}
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {user.name || 'N/A'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {user.type || 'N/A'}
                          </td>

                          <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
                            {user.lastInteraction
                              ? new Date(user.lastInteraction).toLocaleString()
                              : ''}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                            <div className='flex gap-4'>
                              <button
                                onClick={() => openEditForm(user)}
                                className='text-indigo-600 hover:text-indigo-900'
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className='text-red-600 hover:text-red-900'
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
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
        )
      }
    </div >
  )
}
