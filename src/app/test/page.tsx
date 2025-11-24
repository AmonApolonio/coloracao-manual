'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TestItem {
  id: number
  name: string
  created_at: string
}

export default function SupabaseTableTest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<TestItem[]>([])
  const [inputValue, setInputValue] = useState('')
  const [tableExists, setTableExists] = useState<boolean | null>(null)

  // Check if table exists and fetch data
  useEffect(() => {
    checkTableAndFetchData()
  }, [])

  const checkTableAndFetchData = async () => {
    try {
      const { data, error } = await supabase.from('test_items').select('*')

      if (error) {
        if (error.code === 'PGRST116') {
          setTableExists(false)
          setMessage('Table does not exist. Create it first by clicking "Create Table".')
        } else {
          throw error
        }
      } else {
        setTableExists(true)
        setItems(data || [])
        setMessage('✓ Connected to test_items table')
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const createTable = async () => {
    setStatus('loading')
    setMessage('Creating table...')

    try {
      // Using raw SQL execution through a workaround - we'll create via supabase dashboard instructions
      // For now, provide instructions to user
      setMessage(
        'To create the table, go to Supabase Dashboard > SQL Editor and run:\n\nCREATE TABLE test_items (\n  id BIGSERIAL PRIMARY KEY,\n  name TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);'
      )
      setStatus('error')
    } catch (error) {
      setStatus('error')
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const addItem = async () => {
    if (!inputValue.trim()) {
      setMessage('Please enter a name')
      return
    }

    setStatus('loading')
    setMessage('Adding item...')

    try {
      const { data, error } = await supabase
        .from('test_items')
        .insert([{ name: inputValue }])
        .select()

      if (error) throw error

      setItems([...items, data[0]])
      setInputValue('')
      setStatus('success')
      setMessage('✓ Item added successfully!')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      setStatus('error')
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const deleteItem = async (id: number) => {
    setStatus('loading')

    try {
      const { error } = await supabase.from('test_items').delete().eq('id', id)

      if (error) throw error

      setItems(items.filter((item) => item.id !== id))
      setStatus('success')
      setMessage('✓ Item deleted successfully!')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      setStatus('error')
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const refreshData = async () => {
    setStatus('loading')
    setMessage('Refreshing...')
    await checkTableAndFetchData()
    setStatus('idle')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Supabase Table Test</h1>

        {/* Status Message */}
        <div className={`p-4 rounded-md mb-6 ${status === 'success' ? 'bg-green-100 text-green-800' : status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
          <p className="font-semibold whitespace-pre-wrap">{message}</p>
        </div>

        {/* Add Item Form */}
        {tableExists && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Add New Item</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
                placeholder="Enter item name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === 'loading'}
              />
              <button
                onClick={addItem}
                disabled={status === 'loading'}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {status === 'loading' ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Items ({items.length})</h2>
            <div className="flex gap-2">
              {tableExists === false && (
                <button
                  onClick={createTable}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Create Table
                </button>
              )}
              <button
                onClick={refreshData}
                disabled={status === 'loading'}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Created At</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2">{item.id}</td>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => deleteItem(item.id)}
                          disabled={status === 'loading'}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{tableExists ? 'No items yet. Add one to get started!' : 'Table not ready'}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h3 className="font-bold mb-3">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to your Supabase Dashboard</li>
            <li>Open SQL Editor</li>
            <li>Run this SQL to create the table:
              <pre className="bg-gray-800 text-white p-3 rounded mt-2 text-xs overflow-x-auto">
{`CREATE TABLE test_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
              </pre>
            </li>
            <li>Come back here and click "Refresh" to verify the table</li>
            <li>Test adding, viewing, and deleting items</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
