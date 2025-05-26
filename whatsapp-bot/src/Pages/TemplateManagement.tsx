import React, { useEffect, useState } from 'react'
import {
  FiPlus,
  FiX,
  FiFileText,
  FiRefreshCw,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi'

interface Template {
  _id: string
  name: string
  message: string
  content?: string
  [key: string]: any
}

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [showAddTemplateForm, setShowAddTemplateForm] = useState(false)
  const [templateFormData, setTemplateFormData] = useState({ name: '', message: '' })
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null) // Track the template being edited

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true)
        const res = await fetch('https://my-whatsapp-bot-6a9u.onrender.com/api/templates')
        const data = await res.json()
        setTemplates(data || [])
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
      const res = await fetch('https://my-whatsapp-bot-6a9u.onrender.com/api/templates')
      const data = await res.json()
      setTemplates(data || [])
      setTemplateError(null)
    } catch (err) {
      setTemplateError('Failed to load templates')
      console.error(err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleAddOrUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingTemplateId ? 'PUT' : 'POST'
      const url = editingTemplateId
        ? `https://my-whatsapp-bot-6a9u.onrender.com/api/templates/${editingTemplateId}`
        : 'https://my-whatsapp-bot-6a9u.onrender.com/api/templates'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateFormData.name,
          content: templateFormData.message
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (editingTemplateId) {
          setTemplates(templates.map(template => template._id === editingTemplateId ? data.template : template))
        } else {
          setTemplates([...templates, data])
        }
        setShowAddTemplateForm(false)
        setTemplateFormData({ name: '', message: '' })
        setEditingTemplateId(null)
      } else {
        setTemplateError('Failed to save template')
      }
    } catch (err) {
      setTemplateError('Failed to save template')
      console.error(err)
    }
  }

  const handleEditTemplate = (template: Template) => {
    setTemplateFormData({ name: template.name, message: template.content || template.message })
    setEditingTemplateId(template._id) // Set the ID of the template being edited
    setShowAddTemplateForm(true)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        const res = await fetch(`https://my-whatsapp-bot-6a9u.onrender.com/api/templates/${templateId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          setTemplates(templates.filter(template => template._id !== templateId))
        } else {
          setTemplateError('Failed to delete template')
        }
      } catch (err) {
        setTemplateError('Failed to delete template')
        console.error(err)
      }
    }
  }

  return (
    <div className='bg-gray-100 min-h-screen overflow-scroll'>
      {/* Template Add/Edit Modal */}
      {showAddTemplateForm && (
        <div className='fixed inset-0  backdrop-blur-sm flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md shadow-lg border border-gray-300'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold text-gray-800'>{editingTemplateId ? 'Edit Template' : 'Add New Template'}</h3>
              <button onClick={() => setShowAddTemplateForm(false)}>
                <FiX className='text-gray-500' />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateTemplate}>
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
                  {editingTemplateId ? 'Update Template' : 'Add Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Management Header */}
      <div className='p-4 bg-white rounded-lg shadow-md mb-6'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <h2 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
            <FiFileText /> Template Management
          </h2>
          <div className='flex gap-3 flex-wrap'>
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
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-3'>
          {templates.length > 0 ? (
            templates.map(template => (
              <div key={template._id} className='bg-white rounded-lg shadow-lg p-6 flex flex-col gap-2 border border-gray-300'>
                <div className='flex justify-between items-center'>
                  <div className='font-semibold text-indigo-700 text-lg'>{template.name}</div>
                  <div className='flex gap-2'>
                    <button onClick={() => handleEditTemplate(template)} className='text-gray-500 hover:text-indigo-600'>
                      <FiEdit2 />
                    </button>
                    <button onClick={() => handleDeleteTemplate(template._id)} className='text-gray-500 hover:text-red-600'>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
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
}