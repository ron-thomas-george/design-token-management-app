import React, { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import TokenManagement from './components/TokenManagement'
import Integrations from './components/Integrations'
import { Settings, Palette } from 'lucide-react'

function App() {
  const [currentView, setCurrentView] = useState('tokens')

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <header className="bg-[#0f1419] border-b border-[#2d3748]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Palette className="h-8 w-8 text-[#3ecf8e]" />
              <h1 className="text-xl font-bold text-white">Fragmento</h1>
            </div>
            <nav className="flex space-x-4">
              <button
                onClick={() => setCurrentView('tokens')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'tokens'
                    ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#2d3748]'
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setCurrentView('integrations')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'integrations'
                    ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#2d3748]'
                }`}
              >
                Integrations
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {currentView === 'tokens' ? <TokenManagement /> : <Integrations />}
        </div>
      </main>
    </div>
  )
}

export default App
