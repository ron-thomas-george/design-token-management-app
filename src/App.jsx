import React, { useState } from 'react';
import TokenManagement from './components/TokenManagement';
import ApiKeySettings from './components/ApiKeySettings';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Settings, Palette } from 'lucide-react';
import './App.css';

function AppContent() {
  const [currentView, setCurrentView] = useState('tokens');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut } = useAuth();

  return (
      <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <header className="bg-[#0f1419] border-b border-[#2d3748]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <svg width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.5097 13.1826C22.7135 13.1826 23.3068 14.6466 22.4426 15.4847L14.48 23.2069C13.9556 23.7155 13.2538 23.9999 12.5233 23.9999H3.30663C2.10283 23.9999 1.50953 22.536 2.37369 21.6979L10.3363 13.9756C10.8607 13.467 11.5625 13.1826 12.293 13.1826H21.5097Z" fill="#3ECF8E" fillOpacity="0.8"/>
                <path d="M21.7714 6.47949C22.9752 6.47949 23.5685 7.94347 22.7043 8.78154L14.8592 16.3898C14.2595 16.9715 13.4568 17.2968 12.6213 17.2968H3.56835C2.36455 17.2968 1.77125 15.8328 2.63541 14.9948L10.598 7.27249C11.1224 6.76391 11.8242 6.47949 12.5547 6.47949H21.7714Z" fill="#3ECF8E" fillOpacity="0.8"/>
                <path d="M21.5097 4.02872e-07C22.7135 4.55492e-07 23.3068 1.46398 22.4426 2.30205L14.48 10.0243C13.9556 10.5329 13.2538 10.8173 12.5233 10.8173H3.30663C2.10283 10.8173 1.50953 9.35334 2.37369 8.51527L10.3363 0.793002C10.8607 0.284423 11.5625 -3.1932e-08 12.293 0L21.5097 4.02872e-07Z" fill="#3ECF8E" fillOpacity="0.8"/>
              </svg>
              <h1 className="text-xl font-bold text-white">Fragmento</h1>
            </div>
            <div className="flex items-center space-x-4">
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
              <button
                onClick={() => setCurrentView('settings')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'settings'
                    ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#2d3748]'
                }`}
              >
                Settings
              </button>
              </nav>
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 text-sm">{user.email}</span>
                  <button
                    onClick={signOut}
                    className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-md hover:border-gray-500"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-[#3ecf8e] text-black font-medium rounded-md hover:bg-[#2db574]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {currentView === 'tokens' && <TokenManagement />}
          {currentView === 'integrations' && <Integrations />}
          {currentView === 'settings' && <ApiKeySettings />}
        </div>
      </main>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
        <Toaster position="top-right" />
      </div>
    );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
