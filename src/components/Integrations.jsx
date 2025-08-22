import React, { useState, useEffect } from 'react'
import { Github, Slack, Check, X, Settings, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const Integrations = () => {
  const [githubConfig, setGithubConfig] = useState({
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    isConnected: false,
    isVerifying: false
  })

  const [slackConfig, setSlackConfig] = useState({
    channelName: '',
    webhookUrl: '',
    enableNotifications: false,
    notifyOnNewTokens: true,
    notifyOnUpdates: true,
    notifyOnDeletions: true,
    isConnected: false,
    isVerifying: false
  })

  // Load configurations from localStorage on mount
  useEffect(() => {
    const savedGithubConfig = localStorage.getItem('githubConfig')
    const savedSlackConfig = localStorage.getItem('slackConfig')
    
    if (savedGithubConfig) {
      try {
        setGithubConfig(prev => ({ ...prev, ...JSON.parse(savedGithubConfig) }))
      } catch (error) {
        console.error('Error loading GitHub config:', error)
      }
    }
    
    if (savedSlackConfig) {
      try {
        setSlackConfig(prev => ({ ...prev, ...JSON.parse(savedSlackConfig) }))
      } catch (error) {
        console.error('Error loading Slack config:', error)
      }
    }
  }, [])

  const handleGithubConfigChange = (field, value) => {
    setGithubConfig(prev => ({ ...prev, [field]: value, isConnected: false }))
  }

  const handleSlackConfigChange = (field, value) => {
    setSlackConfig(prev => ({ ...prev, [field]: value, isConnected: false }))
  }

  const verifyGithubConnection = async () => {
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      toast.error('Please fill in all GitHub configuration fields')
      return
    }

    setGithubConfig(prev => ({ ...prev, isVerifying: true }))

    try {
      // Verify GitHub connection
      const response = await fetch(`https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}`, {
        headers: {
          'Authorization': `token ${githubConfig.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (response.ok) {
        const updatedConfig = { ...githubConfig, isConnected: true, isVerifying: false }
        setGithubConfig(updatedConfig)
        localStorage.setItem('githubConfig', JSON.stringify(updatedConfig))
        toast.success('GitHub connection verified successfully!')
      } else {
        throw new Error(`GitHub API error: ${response.status}`)
      }
    } catch (error) {
      console.error('GitHub verification error:', error)
      setGithubConfig(prev => ({ ...prev, isConnected: false, isVerifying: false }))
      toast.error('Failed to verify GitHub connection. Please check your credentials.')
    }
  }

  const verifySlackConnection = async () => {
    if (!slackConfig.webhookUrl) {
      toast.error('Please enter a Slack webhook URL')
      return
    }

    setSlackConfig(prev => ({ ...prev, isVerifying: true }))

    try {
      // Test Slack webhook using no-cors mode to avoid CORS preflight issues
      await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // This prevents CORS preflight requests
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Fragmento - Connection test successful! 🎉'
        })
      })

      // With no-cors mode, we can't read the response, so we assume success if no error is thrown
      const updatedConfig = { ...slackConfig, isConnected: true, isVerifying: false }
      setSlackConfig(updatedConfig)
      localStorage.setItem('slackConfig', JSON.stringify(updatedConfig))
      toast.success('Slack connection test sent! Check your Slack channel to confirm.')
    } catch (error) {
      console.error('Slack verification error:', error)
      setSlackConfig(prev => ({ ...prev, isConnected: false, isVerifying: false }))
      toast.error('Failed to send test message to Slack. Please check your webhook URL.')
    }
  }

  const disconnectGithub = () => {
    setGithubConfig({
      token: '',
      owner: '',
      repo: '',
      branch: 'main',
      isConnected: false,
      isVerifying: false
    })
    localStorage.removeItem('githubConfig')
    toast.success('GitHub integration disconnected')
  }

  const disconnectSlack = () => {
    setSlackConfig({
      channelName: '',
      webhookUrl: '',
      enableNotifications: false,
      notifyOnNewTokens: true,
      notifyOnUpdates: true,
      notifyOnDeletions: true,
      isConnected: false,
      isVerifying: false
    })
    localStorage.removeItem('slackConfig')
    toast.success('Slack integration disconnected')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-gray-400">Connect your Fragmento with external services</p>
      </div>

      {/* GitHub Integration */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg">
        <div className="px-6 py-4 border-b border-[#2d3748]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Github className="h-6 w-6 text-gray-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">GitHub Integration</h2>
                <p className="text-sm text-gray-400">Push tokens to your GitHub repository</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {githubConfig.isConnected && (
                <div className="flex items-center space-x-1 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )}
              {!githubConfig.isConnected && githubConfig.token && (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Not Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Personal Access Token *
              </label>
              <input
                type="password"
                value={githubConfig.token}
                onChange={(e) => handleGithubConfigChange('token', e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
              />
              <p className="mt-1 text-xs text-gray-400">
                Generate a token with 'repo' permissions in GitHub Settings
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Repository Owner *
              </label>
              <input
                type="text"
                value={githubConfig.owner}
                onChange={(e) => handleGithubConfigChange('owner', e.target.value)}
                placeholder="username or organization"
                className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Repository Name *
              </label>
              <input
                type="text"
                value={githubConfig.repo}
                onChange={(e) => handleGithubConfigChange('repo', e.target.value)}
                placeholder="my-design-system"
                className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Branch Name
              </label>
              <input
                type="text"
                value={githubConfig.branch}
                onChange={(e) => handleGithubConfigChange('branch', e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={verifyGithubConnection}
              disabled={githubConfig.isVerifying || !githubConfig.token || !githubConfig.owner || !githubConfig.repo}
              className="px-4 py-2 bg-[#3ecf8e] text-black rounded-md hover:bg-[#2dd4aa] focus:ring-2 focus:ring-[#3ecf8e] focus:ring-offset-2 focus:ring-offset-[#0f1419] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {githubConfig.isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span>Verify Connection</span>
                </>
              )}
            </button>

            {githubConfig.isConnected && (
              <button
                onClick={disconnectGithub}
                className="px-4 py-2 bg-[#1a1f2e] border border-[#2d3748] text-gray-300 rounded-md hover:bg-[#2d3748] hover:text-white focus:ring-2 focus:ring-[#3ecf8e] focus:ring-offset-2 focus:ring-offset-[#0f1419] flex items-center space-x-2 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slack Integration */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg">
        <div className="px-6 py-4 border-b border-[#2d3748]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Slack className="h-6 w-6 text-gray-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Slack Integration</h2>
                <p className="text-sm text-gray-400">Get notifications about token changes</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {slackConfig.isConnected && (
                <div className="flex items-center space-x-1 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )}
              {!slackConfig.isConnected && slackConfig.webhookUrl && (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Not Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Webhook URL *
              </label>
              <input
                type="url"
                value={slackConfig.webhookUrl}
                onChange={(e) => handleSlackConfigChange('webhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
              />
              <p className="mt-1 text-xs text-gray-400">
                Create an incoming webhook in your Slack workspace
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Channel Name
              </label>
              <input
                type="text"
                value={slackConfig.channelName}
                onChange={(e) => handleSlackConfigChange('channelName', e.target.value)}
                placeholder="#design-tokens"
                className="w-full px-3 py-2 border border-[#2d3748] rounded-md bg-[#0f1419] text-white focus:ring-2 focus:ring-[#3ecf8e] focus:border-[#3ecf8e]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id="enableNotifications"
                checked={slackConfig.enableNotifications}
                onChange={(e) => handleSlackConfigChange('enableNotifications', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enableNotifications" className="text-sm font-medium text-gray-700">
                Enable Slack Notifications
              </label>
            </div>

            {slackConfig.enableNotifications && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifyNewTokens"
                    checked={slackConfig.notifyOnNewTokens}
                    onChange={(e) => handleSlackConfigChange('notifyOnNewTokens', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="notifyNewTokens" className="text-sm text-gray-700">
                    New token creations
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifyUpdates"
                    checked={slackConfig.notifyOnUpdates}
                    onChange={(e) => handleSlackConfigChange('notifyOnUpdates', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="notifyUpdates" className="text-sm text-gray-700">
                    Token updates
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifyDeletions"
                    checked={slackConfig.notifyOnDeletions}
                    onChange={(e) => handleSlackConfigChange('notifyOnDeletions', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="notifyDeletions" className="text-sm text-gray-700">
                    Token deletions
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={verifySlackConnection}
              disabled={slackConfig.isVerifying || !slackConfig.webhookUrl}
              className="px-4 py-2 bg-[#3ecf8e] text-black rounded-md hover:bg-[#2dd4aa] focus:ring-2 focus:ring-[#3ecf8e] focus:ring-offset-2 focus:ring-offset-[#0f1419] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {slackConfig.isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            {slackConfig.isConnected && (
              <button
                onClick={disconnectSlack}
                className="px-4 py-2 bg-[#1a1f2e] border border-[#2d3748] text-gray-300 rounded-md hover:bg-[#2d3748] hover:text-white focus:ring-2 focus:ring-[#3ecf8e] focus:ring-offset-2 focus:ring-offset-[#0f1419] flex items-center space-x-2 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Integrations
