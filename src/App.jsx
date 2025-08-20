import React, { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import TokenManagement from './components/TokenManagement'
import Integrations from './components/Integrations'
import { Settings, Palette } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('tokens')

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Palette className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Token Management System</h1>
            </div>
            
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('tokens')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'tokens'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                  activeTab === 'integrations'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Integrations</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'tokens' && <TokenManagement />}
        {activeTab === 'integrations' && <Integrations />}
      </main>
    </div>
  )
}

export default App
