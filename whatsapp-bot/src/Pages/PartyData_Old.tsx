import React, { useEffect, useState } from 'react'
import {
  FiPlus,
  FiX,
  FiFileText,
  FiRefreshCw
} from 'react-icons/fi'

interface Template {
  _id: string
  name: string
  message: string
  content?: string // Add this for compatibility with backend
  [key: string]: any // for any extra fields
}

// interface Template {
//   _id: string
//   name: string
//   message: string
//   [key: string]: any // for any extra fields
// }

export default function PartyData() {
  // Template management state
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [showAddTemplateForm, setShowAddTemplateForm] = useState(false)
  const [templateFormData, setTemplateFormData] = useState({ name: '', message: '' })

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true)
        const res = await fetch('http://localhost:3000/api/templates')
        const data = await res.json()
        
        // Handle the correct response format from the backend
        // The backend returns { templates: [...] } instead of just an array
        setTemplates(data.templates || [])
        setTemplateError(null)
      } catch (err) {
        setTemplateError('Failed to load templates')
        console.error(err)
      } finally {
        setLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [])

  const handleRefreshTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const res = await fetch('http://localhost:3000/api/templates')
      const data = await res.json()
      
      // Same fix for the refresh function
      setTemplates(data.templates || [])
      setTemplateError(null)
    } catch (err) {
      setTemplateError('Failed to load templates')
      console.error(err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Add template handler
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateFormData.name,
          content: templateFormData.message // Change message to content to match backend
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        // Add the new template to the list
        // The backend returns the created template directly
        if (data._id) {
          setTemplates([...templates, data])
        } else if (data.templates) {
          // Refresh the whole list if needed
          setTemplates(data.templates)
        }
        setShowAddTemplateForm(false)
        setTemplateFormData({ name: '', message: '' })
      } else {
        setTemplateError('Failed to add template')
      }
    } catch (err) {
      setTemplateError('Failed to add template')
      console.error(err)
    }
  }
  // const [employees, setEmployees] = useState<Employee[]>([])
  // const [loading, setLoading] = useState(true)
  // const [error, setError] = useState<string | null>(null)
  // const [searchTerm, setSearchTerm] = useState('')
  // const [currentPage, setCurrentPage] = useState(1)
  // const [itemsPerPage] = useState(10)
  // const [showAddForm, setShowAddForm] = useState(false)
  // const [showEditForm, setShowEditForm] = useState(false)
  // const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  // const [formData, setFormData] = useState({
  //   name: '',
  //   role: '',
  //   phone: '',
  //   assignedArea: '',
  //   permissions: ''
  // })

  // // Template management state
  // const [templates, setTemplates] = useState<Template[]>([])
  // const [loadingTemplates, setLoadingTemplates] = useState(true)
  // const [templateError, setTemplateError] = useState<string | null>(null)
  // const [showAddTemplateForm, setShowAddTemplateForm] = useState(false)
  // const [templateFormData, setTemplateFormData] = useState({ name: '', message: '' })

  // // Available roles and permissions for dropdowns
  // const availableRoles = ['manager', 'volunteer', 'coordinator', 'admin']
  // const availablePermissions = [
  //   'send_broadcasts',
  //   'manage_users',
  //   'manage_content',
  //   'view_reports'
  // ]

  // // Fetch employees
  // useEffect(() => {
  //   const fetchEmployees = async () => {
  //     try {
  //       setLoading(true)
  //       const res = await fetch(
  //         'http://localhost:3000/api/employees'
  //       )
  //       const data = await res.json()
  //       setEmployees(data)
  //     } catch (err) {
  //       setError('Failed to load employees')
  //       console.error(err)
  //     } finally {
  //       setLoading(false)
  //     }
  //   }

  //   fetchEmployees()
  // }, [])

  // const handleRefresh = async () => {
  //   try {
  //     setLoading(true)
  //     const res = await fetch(
  //       'http://localhost:3000/api/employees'
  //     )
  //     const data = await res.json()
  //     setEmployees(data)
  //   } catch (err) {
  //     setError('Failed to load employees')
  //     console.error(err)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // const handleAddEmployee = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   try {
  //     const res = await fetch(
  //       'http://localhost:3000/api/employees',
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify({
  //           ...formData,
  //           permissions: formData.permissions.split(',').map(s => s.trim())
  //         })
  //       }
  //     )

  //     if (res.ok) {
  //       const newEmployee = await res.json()
  //       setEmployees([...employees, newEmployee])
  //       setShowAddForm(false)
  //       resetForm()
  //     }
  //   } catch (err) {
  //     setError('Failed to add employee')
  //   }
  // }

  // const handleEditEmployee = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   if (!currentEmployee) return

  //   try {
  //     const res = await fetch(
  //       `http://localhost:3000/api/employees/${currentEmployee._id}`,
  //       {
  //         method: 'PUT',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify({
  //           ...formData,
  //           permissions: formData.permissions.split(',').map(s => s.trim())
  //         })
  //       }
  //     )

  //     if (res.ok) {
  //       const updatedEmployee = await res.json()
  //       setEmployees(
  //         employees.map(e =>
  //           e._id === updatedEmployee._id ? updatedEmployee : e
  //         )
  //       )
  //       setShowEditForm(false)
  //       resetForm()
  //     }
  //   } catch (err) {
  //     setError('Failed to update employee')
  //   }
  // }

  // const handleDeleteEmployee = async (id: string) => {
  //   if (window.confirm('Are you sure you want to delete this employee?')) {
  //     try {
  //       const res = await fetch(
  //         `http://localhost:3000/api/employees/${id}`,
  //         {
  //           method: 'DELETE'
  //         }
  //       )

  //       if (res.ok) {
  //         setEmployees(employees.filter(e => e._id !== id))
  //       }
  //     } catch (err) {
  //       setError('Failed to delete employee')
  //     }
  //   }
  // }

  // const resetForm = () => {
  //   setFormData({
  //     name: '',
  //     role: '',
  //     phone: '',
  //     assignedArea: '',
  //     permissions: ''
  //   })
  // }

  // const openEditForm = (employee: Employee) => {
  //   setCurrentEmployee(employee)
  //   setFormData({
  //     name: employee.name,
  //     role: employee.role,
  //     phone: employee.phone,
  //     assignedArea: employee.assignedArea || '',
  //     permissions: employee.permissions.join(', ')
  //   })
  //   setShowEditForm(true)
  // }

  // // Filter and pagination logic
  // const filteredEmployees = employees.filter(
  //   employee =>
  //     employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     employee.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  // )

  // const indexOfLastItem = currentPage * itemsPerPage
  // const indexOfFirstItem = indexOfLastItem - itemsPerPage
  // const currentEmployees = filteredEmployees.slice(
  //   indexOfFirstItem,
  //   indexOfLastItem
  // )
  // const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)

  return (
    <div className='bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden m-6'>
      {/* Template Add Modal */}
      {showAddTemplateForm && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold'>Add New Template</h3>
              <button onClick={() => setShowAddTemplateForm(false)}>
                <FiX className='text-gray-500' />
              </button>
            </div>
            <form onSubmit={handleAddTemplate}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Template Name*
                  </label>
                  <input
                    type='text'
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    value={templateFormData.name}
                    onChange={e =>
                      setTemplateFormData({ ...templateFormData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Message*
                  </label>
                  <textarea
                    className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                    rows={5}
                    value={templateFormData.message}
                    onChange={e =>
                      setTemplateFormData({ ...templateFormData, message: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => setShowAddTemplateForm(false)}
                  className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Add Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Management Header */}
      <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <h2 className='text-lg font-semibold text-gray-800 flex items-center gap-2'>
          <FiFileText /> Template Management
        </h2>
        <div className='flex gap-3'>
          <button
            className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            onClick={handleRefreshTemplates}
            disabled={loadingTemplates}
          >
            <FiRefreshCw className={`${loadingTemplates ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
            onClick={() => setShowAddTemplateForm(true)}
          >
            <FiPlus />
            <span>Add Template</span>
          </button>
        </div>
      </div>

      {/* Template Error Display */}
      {templateError && (
        <div className='text-red-500 p-4 text-center'>{templateError}</div>
      )}

      {/* Template Loading State */}
      {loadingTemplates ? (
        <div className='p-8 flex justify-center items-center'>
          <div className='animate-pulse flex space-x-4'>
            <div className='flex-1 space-y-4 py-1'>
              <div className='h-4 bg-gray-200 rounded w-3/4'></div>
              <div className='space-y-2'>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className='h-4 bg-gray-200 rounded'></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4'>
        {templates.length > 0 ? (
          templates.map(template => (
            <div key={template._id} className='bg-gray-50 rounded-lg shadow p-4 flex flex-col gap-2'>
              <div className='font-semibold text-indigo-700 text-lg'>{template.name}</div>
              <div className='text-gray-700 whitespace-pre-line break-words'>
                {template.message || template.content}
              </div>
            </div>
          ))
        ) : (
          <div className='col-span-full text-center text-gray-500'>No templates found.</div>
        )}
      </div>
      )}
    </div>
  )

  // return (
  //   <div className='bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden m-6'>
  //     {/* Add Employee Modal */}
  //     {showAddForm && (
  //       <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
  //         <div className='bg-white rounded-lg p-6 w-full max-w-md'>
  //           <div className='flex justify-between items-center mb-4'>
  //             <h3 className='text-lg font-semibold'>Add New Employee</h3>
  //             <button onClick={() => setShowAddForm(false)}>
  //               <FiX className='text-gray-500' />
  //             </button>
  //           </div>
  //           <form onSubmit={handleAddEmployee}>
  //             <div className='space-y-4'>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Name*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.name}
  //                   onChange={e =>
  //                     setFormData({ ...formData, name: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Role*
  //                 </label>
  //                 <select
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.role}
  //                   onChange={e =>
  //                     setFormData({ ...formData, role: e.target.value })
  //                   }
  //                   required
  //                 >
  //                   <option value=''>Select Role</option>
  //                   {availableRoles.map(role => (
  //                     <option key={role} value={role}>
  //                       {role.charAt(0).toUpperCase() + role.slice(1)}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Phone*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.phone}
  //                   onChange={e =>
  //                     setFormData({ ...formData, phone: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Assigned Area
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.assignedArea}
  //                   onChange={e =>
  //                     setFormData({ ...formData, assignedArea: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Permissions (comma separated)
  //                 </label>
  //                 <select
  //                   multiple
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.permissions.split(',').map(s => s.trim())}
  //                   onChange={e => {
  //                     const options = Array.from(
  //                       e.target.selectedOptions,
  //                       option => option.value
  //                     )
  //                     setFormData({
  //                       ...formData,
  //                       permissions: options.join(', ')
  //                     })
  //                   }}
  //                 >
  //                   {availablePermissions.map(permission => (
  //                     <option key={permission} value={permission}>
  //                       {permission
  //                         .replace(/_/g, ' ')
  //                         .replace(/\b\w/g, l => l.toUpperCase())}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //             </div>
  //             <div className='mt-6 flex justify-end space-x-3'>
  //               <button
  //                 type='button'
  //                 onClick={() => setShowAddForm(false)}
  //                 className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Cancel
  //               </button>
  //               <button
  //                 type='submit'
  //                 className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Add Employee
  //               </button>
  //             </div>
  //           </form>
  //         </div>
  //       </div>
  //     )}

  //     {/* Edit Employee Modal */}
  //     {showEditForm && currentEmployee && (
  //       <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
  //         <div className='bg-white rounded-lg p-6 w-full max-w-md'>
  //           <div className='flex justify-between items-center mb-4'>
  //             <h3 className='text-lg font-semibold'>Edit Employee</h3>
  //             <button onClick={() => setShowEditForm(false)}>
  //               <FiX className='text-gray-500' />
  //             </button>
  //           </div>
  //           <form onSubmit={handleEditEmployee}>
  //             <div className='space-y-4'>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Name*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.name}
  //                   onChange={e =>
  //                     setFormData({ ...formData, name: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Role*
  //                 </label>
  //                 <select
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.role}
  //                   onChange={e =>
  //                     setFormData({ ...formData, role: e.target.value })
  //                   }
  //                   required
  //                 >
  //                   {availableRoles.map(role => (
  //                     <option key={role} value={role}>
  //                       {role.charAt(0).toUpperCase() + role.slice(1)}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Phone*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.phone}
  //                   onChange={e =>
  //                     setFormData({ ...formData, phone: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Assigned Area
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.assignedArea}
  //                   onChange={e =>
  //                     setFormData({ ...formData, assignedArea: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Permissions (comma separated)
  //                 </label>
  //                 <select
  //                   multiple
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.permissions.split(',').map(s => s.trim())}
  //                   onChange={e => {
  //                     const options = Array.from(
  //                       e.target.selectedOptions,
  //                       option => option.value
  //                     )
  //                     setFormData({
  //                       ...formData,
  //                       permissions: options.join(', ')
  //                     })
  //                   }}
  //                 >
  //                   {availablePermissions.map(permission => (
  //                     <option key={permission} value={permission}>
  //                       {permission
  //                         .replace(/_/g, ' ')
  //                         .replace(/\b\w/g, l => l.toUpperCase())}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //             </div>
  //             <div className='mt-6 flex justify-end space-x-3'>
  //               <button
  //                 type='button'
  //                 onClick={() => setShowEditForm(false)}
  //                 className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Cancel
  //               </button>
  //               <button
  //                 type='submit'
  //                 className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Update Employee
  //               </button>
  //             </div>
  //           </form>
  //         </div>
  //       </div>
  //     )}

  //     {/* Main Content */}
  //     <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
  //       <h2 className='text-lg font-semibold text-gray-800'>
  //         Party Data Management
  //       </h2>
  //       <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
  //         <div className='relative flex-1 sm:w-64'>
  //           <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
  //             <FiSearch className='text-gray-400' />
  //           </div>
  //           <input
  //             type='text'
  //             placeholder='Search employees...'
  //             className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
  //             value={searchTerm}
  //             onChange={e => setSearchTerm(e.target.value)}
  //           />
  //         </div>
  //         <button
  //           className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
  //           onClick={handleRefresh}
  //           disabled={loading}
  //         >
  //           <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
  //           <span>Refresh</span>
  //         </button>
  //         <button
  //           className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
  //           onClick={() => setShowAddForm(true)}
  //         >
  //           <FiPlus />
  //           <span>Add Employee</span>
  //         </button>
  //       </div>
  //     </div>

  //     {error ? (
  //       <div className='text-red-500 p-4 text-center'>{error}</div>
  //     ) : loading ? (
  //       <div className='p-8 flex justify-center items-center'>
  //         <div className='animate-pulse flex space-x-4'>
  //           <div className='flex-1 space-y-4 py-1'>
  //             <div className='h-4 bg-gray-200 rounded w-3/4'></div>
  //             <div className='space-y-2'>
  //               {[...Array(5)].map((_, i) => (
  //                 <div key={i} className='h-4 bg-gray-200 rounded'></div>
  //               ))}
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     ) : (
  //       <>
  //         <div className='overflow-x-auto'>
  //           <table className='min-w-full divide-y divide-gray-200'>
  //             <thead className='bg-gray-50'>
  //               <tr>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   S. NO.
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Name
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Role
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Phone
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Assigned Area
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Permissions
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Actions
  //                 </th>
  //               </tr>
  //             </thead>
  //             <tbody className='bg-white divide-y divide-gray-200'>
  //               {currentEmployees.length > 0 ? (
  //                 currentEmployees.map((employee, index) => (
  //                   <tr key={employee._id} className='hover:bg-gray-50'>
  //                     <td className='px-6 py-4 whitespace-nowrap'>
  //                       <div className='text-sm font-medium text-gray-900'>
  //                         {indexOfFirstItem + index + 1}
  //                       </div>
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap'>
  //                       <div className='text-sm font-medium text-gray-900'>
  //                         {employee.name}
  //                       </div>
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap'>
  //                       <div className='text-sm text-gray-500 capitalize'>
  //                         {employee.role}
  //                       </div>
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
  //                       {employee.phone}
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
  //                       {employee.assignedArea || 'N/A'}
  //                     </td>
  //                     <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
  //                       {employee.permissions}
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
  //                       <div className='flex space-x-2'>
  //                         <button
  //                           onClick={() => openEditForm(employee)}
  //                           className='text-indigo-600 hover:text-indigo-900'
  //                         >
  //                           <FiEdit2 />
  //                         </button>
  //                         <button
  //                           onClick={() => handleDeleteEmployee(employee._id)}
  //                           className='text-red-600 hover:text-red-900'
  //                         >
  //                           <FiTrash2 />
  //                         </button>
  //                       </div>
  //                     </td>
  //                   </tr>
  //                 ))
  //               ) : (
  //                 <tr>
  //                   <td
  //                     colSpan={6}
  //                     className='px-6 py-4 text-center text-sm text-gray-500'
  //                   >
  //                     No employees found
  //                   </td>
  //                 </tr>
  //               )}
  //             </tbody>
  //           </table>
  //         </div>

  //         {/* Pagination */}
  //         {filteredEmployees.length > itemsPerPage && (
  //           <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
  //             <div className='text-sm text-gray-700'>
  //               Showing{' '}
  //               <span className='font-medium'>{indexOfFirstItem + 1}</span> to{' '}
  //               <span className='font-medium'>
  //                 {Math.min(indexOfLastItem, filteredEmployees.length)}
  //               </span>{' '}
  //               of{' '}
  //               <span className='font-medium'>{filteredEmployees.length}</span>{' '}
  //               employees
  //             </div>
  //             <div className='flex space-x-2'>
  //               <button
  //                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
  //                 disabled={currentPage === 1}
  //                 className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
  //               >
  //                 <FiChevronLeft />
  //               </button>
  //               <button
  //                 onClick={() =>
  //                   setCurrentPage(prev => Math.min(prev + 1, totalPages))
  //                 }
  //                 disabled={currentPage === totalPages}
  //                 className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
  //               >
  //                 <FiChevronRight />
  //               </button>
  //             </div>
  //           </div>
  //         )}
  //       </>
  //     )}
  //   </div>
  // )

  // // Add template fetch useEffect
  // useEffect(() => {
  //   const fetchTemplates = async () => {
  //     try {
  //       setLoadingTemplates(true)
  //       const res = await fetch('http://localhost:3000/api/templates')
  //       const data = await res.json()
  //       setTemplates(data)
  //       setTemplateError(null)
  //     } catch (err) {
  //       setTemplateError('Failed to load templates')
  //       console.error(err)
  //     } finally {
  //       setLoadingTemplates(false)
  //     }
  //   }

  //   fetchTemplates()
  // }, [])

  // // Add template handler
  // const handleAddTemplate = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   try {
  //     const res = await fetch('http://localhost:3000/api/templates', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(templateFormData)
  //     })
  //     if (res.ok) {
  //       const newTemplate = await res.json()
  //       setTemplates([...templates, newTemplate])
  //       setShowAddTemplateForm(false)
  //       setTemplateFormData({ name: '', message: '' })
  //     } else {
  //       setTemplateError('Failed to add template')
  //     }
  //   } catch (err) {
  //     setTemplateError('Failed to add template')
  //     console.error(err)
  //   }
  // }

  // return (
  //   <div className='bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden m-6'>
  //     {/* Add Employee Modal */}
  //     {showAddForm && (
  //       <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
  //         <div className='bg-white rounded-lg p-6 w-full max-w-md'>
  //           <div className='flex justify-between items-center mb-4'>
  //             <h3 className='text-lg font-semibold'>Add New Employee</h3>
  //             <button onClick={() => setShowAddForm(false)}>
  //               <FiX className='text-gray-500' />
  //             </button>
  //           </div>
  //           <form onSubmit={handleAddEmployee}>
  //             <div className='space-y-4'>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Name*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.name}
  //                   onChange={e =>
  //                     setFormData({ ...formData, name: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Role*
  //                 </label>
  //                 <select
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.role}
  //                   onChange={e =>
  //                     setFormData({ ...formData, role: e.target.value })
  //                   }
  //                   required
  //                 >
  //                   <option value=''>Select Role</option>
  //                   {availableRoles.map(role => (
  //                     <option key={role} value={role}>
  //                       {role.charAt(0).toUpperCase() + role.slice(1)}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Phone*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.phone}
  //                   onChange={e =>
  //                     setFormData({ ...formData, phone: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Assigned Area
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.assignedArea}
  //                   onChange={e =>
  //                     setFormData({ ...formData, assignedArea: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Permissions (comma separated)
  //                 </label>
  //                 <select
  //                   multiple
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.permissions.split(',').map(s => s.trim())}
  //                   onChange={e => {
  //                     const options = Array.from(
  //                       e.target.selectedOptions,
  //                       option => option.value
  //                     )
  //                     setFormData({
  //                       ...formData,
  //                       permissions: options.join(', ')
  //                     })
  //                   }}
  //                 >
  //                   {availablePermissions.map(permission => (
  //                     <option key={permission} value={permission}>
  //                       {permission
  //                         .replace(/_/g, ' ')
  //                         .replace(/\b\w/g, l => l.toUpperCase())}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //             </div>
  //             <div className='mt-6 flex justify-end space-x-3'>
  //               <button
  //                 type='button'
  //                 onClick={() => setShowAddForm(false)}
  //                 className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Cancel
  //               </button>
  //               <button
  //                 type='submit'
  //                 className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Add Employee
  //               </button>
  //             </div>
  //           </form>
  //         </div>
  //       </div>
  //     )}

  //     {/* Edit Employee Modal */}
  //     {showEditForm && currentEmployee && (
  //       <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
  //         <div className='bg-white rounded-lg p-6 w-full max-w-md'>
  //           <div className='flex justify-between items-center mb-4'>
  //             <h3 className='text-lg font-semibold'>Edit Employee</h3>
  //             <button onClick={() => setShowEditForm(false)}>
  //               <FiX className='text-gray-500' />
  //             </button>
  //           </div>
  //           <form onSubmit={handleEditEmployee}>
  //             <div className='space-y-4'>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Name*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.name}
  //                   onChange={e =>
  //                     setFormData({ ...formData, name: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Role*
  //                 </label>
  //                 <select
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.role}
  //                   onChange={e =>
  //                     setFormData({ ...formData, role: e.target.value })
  //                   }
  //                   required
  //                 >
  //                   {availableRoles.map(role => (
  //                     <option key={role} value={role}>
  //                       {role.charAt(0).toUpperCase() + role.slice(1)}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Phone*
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.phone}
  //                   onChange={e =>
  //                     setFormData({ ...formData, phone: e.target.value })
  //                   }
  //                   required
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Assigned Area
  //                 </label>
  //                 <input
  //                   type='text'
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.assignedArea}
  //                   onChange={e =>
  //                     setFormData({ ...formData, assignedArea: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <label className='block text-sm font-medium text-gray-700'>
  //                   Permissions (comma separated)
  //                 </label>
  //                 <select
  //                   multiple
  //                   className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //                   value={formData.permissions.split(',').map(s => s.trim())}
  //                   onChange={e => {
  //                     const options = Array.from(
  //                       e.target.selectedOptions,
  //                       option => option.value
  //                     )
  //                     setFormData({
  //                       ...formData,
  //                       permissions: options.join(', ')
  //                     })
  //                   }}
  //                 >
  //                   {availablePermissions.map(permission => (
  //                     <option key={permission} value={permission}>
  //                       {permission
  //                         .replace(/_/g, ' ')
  //                         .replace(/\b\w/g, l => l.toUpperCase())}
  //                     </option>
  //                   ))}
  //                 </select>
  //               </div>
  //             </div>
  //             <div className='mt-6 flex justify-end space-x-3'>
  //               <button
  //                 type='button'
  //                 onClick={() => setShowEditForm(false)}
  //                 className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Cancel
  //               </button>
  //               <button
  //                 type='submit'
  //                 className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //               >
  //                 Update Employee
  //               </button>
  //             </div>
  //           </form>
  //         </div>
  //       </div>
  //     )}

  //     {/* Main Content */}
  //     <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
  //       <h2 className='text-lg font-semibold text-gray-800'>
  //         Party Data Management
  //       </h2>
  //       <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
  //         <div className='relative flex-1 sm:w-64'>
  //           <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
  //             <FiSearch className='text-gray-400' />
  //           </div>
  //           <input
  //             type='text'
  //             placeholder='Search employees...'
  //             className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
  //             value={searchTerm}
  //             onChange={e => setSearchTerm(e.target.value)}
  //           />
  //         </div>
  //         <button
  //           className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
  //           onClick={handleRefresh}
  //           disabled={loading}
  //         >
  //           <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
  //           <span>Refresh</span>
  //         </button>
  //         <button
  //           className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
  //           onClick={() => setShowAddForm(true)}
  //         >
  //           <FiPlus />
  //           <span>Add Employee</span>
  //         </button>
  //       </div>
  //     </div>

  //     {error ? (
  //       <div className='text-red-500 p-4 text-center'>{error}</div>
  //     ) : loading ? (
  //       <div className='p-8 flex justify-center items-center'>
  //         <div className='animate-pulse flex space-x-4'>
  //           <div className='flex-1 space-y-4 py-1'>
  //             <div className='h-4 bg-gray-200 rounded w-3/4'></div>
  //             <div className='space-y-2'>
  //               {[...Array(5)].map((_, i) => (
  //                 <div key={i} className='h-4 bg-gray-200 rounded'></div>
  //               ))}
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     ) : (
  //       <>
  //         <div className='overflow-x-auto'>
  //           <table className='min-w-full divide-y divide-gray-200'>
  //             <thead className='bg-gray-50'>
  //               <tr>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   S. NO.
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Name
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Role
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Phone
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Assigned Area
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Permissions
  //                 </th>
  //                 <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
  //                   Actions
  //                 </th>
  //               </tr>
  //             </thead>
  //             <tbody className='bg-white divide-y divide-gray-200'>
  //               {currentEmployees.length > 0 ? (
  //                 currentEmployees.map((employee, index) => (
  //                   <tr key={employee._id} className='hover:bg-gray-50'>
  //                     <td className='px-6 py-4 whitespace-nowrap'>
  //                       <div className='text-sm font-medium text-gray-900'>
  //                         {indexOfFirstItem + index + 1}
  //                       </div>
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap'>
  //                       <div className='text-sm font-medium text-gray-900'>
  //                         {employee.name}
  //                       </div>
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap'>
  //                       <div className='text-sm text-gray-500 capitalize'>
  //                         {employee.role}
  //                       </div>
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
  //                       {employee.phone}
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
  //                       {employee.assignedArea || 'N/A'}
  //                     </td>
  //                     <td className='px-6 py-4 text-sm text-gray-500 max-w-xs truncate'>
  //                       {employee.permissions}
  //                     </td>
  //                     <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
  //                       <div className='flex space-x-2'>
  //                         <button
  //                           onClick={() => openEditForm(employee)}
  //                           className='text-indigo-600 hover:text-indigo-900'
  //                         >
  //                           <FiEdit2 />
  //                         </button>
  //                         <button
  //                           onClick={() => handleDeleteEmployee(employee._id)}
  //                           className='text-red-600 hover:text-red-900'
  //                         >
  //                           <FiTrash2 />
  //                         </button>
  //                       </div>
  //                     </td>
  //                   </tr>
  //                 ))
  //               ) : (
  //                 <tr>
  //                   <td
  //                     colSpan={6}
  //                     className='px-6 py-4 text-center text-sm text-gray-500'
  //                   >
  //                     No employees found
  //                   </td>
  //                 </tr>
  //               )}
  //             </tbody>
  //           </table>
  //         </div>

  //         {/* Pagination */}
  //         {filteredEmployees.length > itemsPerPage && (
  //           <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
  //             <div className='text-sm text-gray-700'>
  //               Showing{' '}
  //               <span className='font-medium'>{indexOfFirstItem + 1}</span> to{' '}
  //               <span className='font-medium'>
  //                 {Math.min(indexOfLastItem, filteredEmployees.length)}
  //               </span>{' '}
  //               of{' '}
  //               <span className='font-medium'>{filteredEmployees.length}</span>{' '}
  //               employees
  //             </div>
  //             <div className='flex space-x-2'>
  //               <button
  //                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
  //                 disabled={currentPage === 1}
  //                 className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
  //               >
  //                 <FiChevronLeft />
  //               </button>
  //               <button
  //                 onClick={() =>
  //                   setCurrentPage(prev => Math.min(prev + 1, totalPages))
  //                 }
  //                 disabled={currentPage === totalPages}
  //                 className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
  //               >
  //                 <FiChevronRight />
  //               </button>
  //             </div>
  //           </div>
  //         )}
  //       </>
  //     )}
  //   </div>
  // )

  // {/* Template Management Section */}
  // {showAddTemplateForm && (
  //   <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
  //     <div className='bg-white rounded-lg p-6 w-full max-w-md'>
  //       <div className='flex justify-between items-center mb-4'>
  //         <h3 className='text-lg font-semibold'>Add New Template</h3>
  //         <button onClick={() => setShowAddTemplateForm(false)}>
  //           <FiX className='text-gray-500' />
  //         </button>
  //       </div>
  //       <form onSubmit={handleAddTemplate}>
  //         <div className='space-y-4'>
  //           <div>
  //             <label className='block text-sm font-medium text-gray-700'>
  //               Template Name*
  //             </label>
  //             <input
  //               type='text'
  //               className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //               value={templateFormData.name}
  //               onChange={e =>
  //                 setTemplateFormData({ ...templateFormData, name: e.target.value })
  //               }
  //               required
  //             />
  //           </div>
  //           <div>
  //             <label className='block text-sm font-medium text-gray-700'>
  //               Message*
  //             </label>
  //             <textarea
  //               className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
  //               value={templateFormData.message}
  //               onChange={e =>
  //                 setTemplateFormData({ ...templateFormData, message: e.target.value })
  //               }
  //               required
  //             />
  //           </div>
  //         </div>
  //         <div className='mt-6 flex justify-end space-x-3'>
  //           <button
  //             type='button'
  //             onClick={() => setShowAddTemplateForm(false)}
  //             className='px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //           >
  //             Cancel
  //           </button>
  //           <button
  //             type='submit'
  //             className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
  //           >
  //             Add Template
  //           </button>
  //         </div>
  //       </form>
  //     </div>
  //   </div>
  // )}

  // <div className='p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
  //   <h2 className='text-lg font-semibold text-gray-800 flex items-center gap-2'>
  //     <FiFileText /> Template Management
  //   </h2>
  //   <button
  //     className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
  //     onClick={() => setShowAddTemplateForm(true)}
  //   >
  //     <FiPlus />
  //     <span>Add Template</span>
  //   </button>
  // </div>
  // {
  //   templateError && (
  //     <div className='text-red-500 p-4 text-center'>{templateError}</div>
  //   )
  // }
  // {
  //   loadingTemplates ? (
  //     <div className='p-8 flex justify-center items-center'>
  //       <div className='animate-pulse flex space-x-4'>
  //         <div className='flex-1 space-y-4 py-1'>
  //           <div className='h-4 bg-gray-200 rounded w-3/4'></div>
  //           <div className='space-y-2'>
  //             {[...Array(3)].map((_, i) => (
  //               <div key={i} className='h-4 bg-gray-200 rounded'></div>
  //             ))}
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   ) : (
  //     <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4'>
  //       {templates.length > 0 ? (
  //         templates.map(template => (
  //           <div key={template._id} className='bg-gray-50 rounded-lg shadow p-4 flex flex-col gap-2'>
  //             <div className='font-semibold text-indigo-700 text-lg'>{template.name}</div>
  //             <div className='text-gray-700 whitespace-pre-line break-words'>{template.message}</div>
  //           </div>
  //         ))
  //       ) : (
  //         <div className='col-span-full text-center text-gray-500'>No templates found.</div>
  //       )}
  //     </div>
  //   )

}