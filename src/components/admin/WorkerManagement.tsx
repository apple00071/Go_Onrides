'use client';

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'react-hot-toast'

interface Worker {
  id: string
  email: string
  role: string
  created_at: string
}

interface WorkerManagementProps {
  initialWorkers: Worker[]
}

const WorkerManagement = ({ initialWorkers }: WorkerManagementProps) => {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers)
  const [newWorkerEmail, setNewWorkerEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Create a new user with worker role
      const { data, error } = await supabase.auth.signUp({
        email: newWorkerEmail,
        password: Math.random().toString(36).slice(-8), // Generate random password
        options: {
          data: {
            role: 'worker',
          },
        },
      })

      if (error) throw error

      // Add user to the users table
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user?.id,
            email: newWorkerEmail,
            role: 'worker',
          },
        ])

      if (insertError) throw insertError

      toast.success('Worker added successfully! They will receive an email to set their password.')
      setNewWorkerEmail('')
      
      // Refresh workers list
      const { data: updatedWorkers } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })
      
      if (updatedWorkers) {
        setWorkers(updatedWorkers)
      }
    } catch (error) {
      console.error('Error adding worker:', error)
      toast.error('Failed to add worker')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to delete this worker?')) return

    try {
      // Delete from auth.users
      const { error: authError } = await supabase.auth.admin.deleteUser(workerId)
      if (authError) throw authError

      // Delete from users table
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', workerId)
      
      if (dbError) throw dbError

      setWorkers(workers.filter(w => w.id !== workerId))
      toast.success('Worker deleted successfully')
    } catch (error) {
      console.error('Error deleting worker:', error)
      toast.error('Failed to delete worker')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Worker Management</h1>
        <form onSubmit={handleAddWorker} className="flex gap-4">
          <input
            type="email"
            value={newWorkerEmail}
            onChange={(e) => setNewWorkerEmail(e.target.value)}
            placeholder="Enter worker email"
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add Worker'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{worker.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {worker.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(worker.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteWorker(worker.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkerManagement 