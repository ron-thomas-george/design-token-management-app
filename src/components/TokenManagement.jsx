import React, { useState, useEffect } from 'react'
import { Plus, Upload, Github, Figma } from 'lucide-react'
import toast from 'react-hot-toast'
import TokenDialog from './TokenDialog'
import TokenTable from './TokenTable'
import { pushTokensToGitHub } from '../services/githubService'
import { createSlackService } from '../services/slackService'
import { debugGitHubPush, testGitHubAuth } from '../utils/debugGitHub'
import { supabaseTokenService } from '../services/supabaseService'

const TokenManagement = () => {
  const [tokens, setTokens] = useState([])
  const [changedTokens, setChangedTokens] = useState(new Set())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingToken, setEditingToken] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load tokens from Supabase on mount
  useEffect(() => {
    loadTokensFromSupabase()
  }, [])

  const loadTokensFromSupabase = async () => {
    setIsLoading(true)
    try {
      const result = await supabaseTokenService.getAllTokens()
      if (result.success) {
        setTokens(result.data)
      } else {
        console.error('Error loading tokens:', result.error)
        toast.error('Failed to load tokens from database')
        // Fallback to localStorage if Supabase fails
        const savedTokens = localStorage.getItem('designTokens')
        if (savedTokens) {
          setTokens(JSON.parse(savedTokens))
        }
      }
    } catch (error) {
      console.error('Error loading tokens:', error)
      toast.error('Failed to load tokens')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateToken = () => {
    setEditingToken(null)
    setIsDialogOpen(true)
  }

  const handleEditToken = (token) => {
    setEditingToken(token)
    setIsDialogOpen(true)
  }

  const handleSaveToken = async (tokenData) => {
    setIsLoading(true)
    try {
      if (editingToken) {
        // Update existing token in Supabase
        const result = await supabaseTokenService.updateToken(editingToken.id, tokenData)
        if (result.success) {
          setTokens(prev => prev.map(token => 
            token.id === editingToken.id ? result.data : token
          ))
          setChangedTokens(prev => new Set([...prev, result.data.id]))
          toast.success('Token updated successfully')
          sendSlackNotification([result.data], 'updated')
        } else {
          throw new Error(result.error)
        }
      } else {
        // Create new token in Supabase
        const result = await supabaseTokenService.createToken(tokenData)
        if (result.success) {
          setTokens(prev => [...prev, result.data])
          setChangedTokens(prev => new Set([...prev, result.data.id]))
          toast.success('Token created successfully')
          sendSlackNotification([result.data], 'created')
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      console.error('Error saving token:', error)
      toast.error(`Failed to save token: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteToken = async (tokenId) => {
    if (window.confirm('Are you sure you want to delete this token?')) {
      const tokenToDelete = tokens.find(t => t.id === tokenId)
      setIsLoading(true)
      try {
        const result = await supabaseTokenService.deleteToken(tokenId)
        if (result.success) {
          setTokens(prev => prev.filter(token => token.id !== tokenId))
          setChangedTokens(prev => {
            const newSet = new Set(prev)
            newSet.delete(tokenId)
            return newSet
          })
          toast.success('Token deleted successfully')
          if (tokenToDelete) {
            sendSlackNotification([tokenToDelete], 'deleted')
          }
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('Error deleting token:', error)
        toast.error(`Failed to delete token: ${error.message}`)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handlePushToFigma = async () => {
    if (changedTokens.size === 0) {
      toast.error('No changes to push to Figma')
      return
    }

    setIsLoading(true)
    try {
      // Get only changed tokens
      const tokensToSync = tokens.filter(token => changedTokens.has(token.id))
      
      // Create Figma plugin interface
      const figmaPluginCode = generateFigmaPluginCode(tokensToSync)
      
      // Create a blob and download the plugin code
      const blob = new Blob([figmaPluginCode], { type: 'text/javascript' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'figma-token-plugin.js'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Clear changed tokens after successful push
      setChangedTokens(new Set())
      toast.success(`Figma plugin downloaded! ${tokensToSync.length} tokens ready to sync.`)
    } catch (error) {
      console.error('Error pushing to Figma:', error)
      toast.error('Failed to generate Figma plugin')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePushToGithub = async () => {
    if (changedTokens.size === 0) {
      toast.error('No changes to push to GitHub')
      return
    }

    // Check if GitHub is configured
    const githubConfig = JSON.parse(localStorage.getItem('githubConfig') || '{}')
    if (!githubConfig.token || !githubConfig.repo || !githubConfig.owner) {
      toast.error('Please configure GitHub integration in the Integrations page')
      return
    }

    setIsLoading(true)
    try {
      const tokensToSync = tokens.filter(token => changedTokens.has(token.id))
      
      console.log('Tokens to sync:', tokensToSync)
      console.log('GitHub config:', { ...githubConfig, token: '[HIDDEN]' })
      
      if (tokensToSync.length === 0) {
        toast.error('No tokens to sync. Make sure you have created or modified tokens.')
        return
      }
      
      // Debug GitHub connection first
      const debugResult = await debugGitHubPush(tokensToSync, githubConfig)
      if (!debugResult.success) {
        throw new Error(`GitHub connection failed: ${debugResult.error}`)
      }
      
      // Test authentication
      const authResult = await testGitHubAuth(githubConfig)
      if (!authResult.success) {
        throw new Error(`GitHub authentication failed: ${authResult.error}`)
      }
      
      // Push to GitHub using the GitHub service
      const result = await pushTokensToGitHub(tokensToSync, githubConfig)
      
      console.log('GitHub push result:', result)
      
      // Send Slack notification about the push
      await sendSlackNotification(tokensToSync, 'pushed')
      
      // Show additional info about PR if created
      if (result.pullRequest) {
        toast.success(`Successfully pushed ${tokensToSync.length} tokens to GitHub and created PR #${result.pullRequest.number}`)
      } else {
        toast.success(`Successfully pushed ${tokensToSync.length} tokens to GitHub`)
      }
      
      // Clear changed tokens after successful push
      setChangedTokens(new Set())
    } catch (error) {
      console.error('Error pushing to GitHub:', error)
      toast.error(`Failed to push tokens to GitHub: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const generateFigmaPluginCode = (tokensToSync) => {
    return `// Figma Token Plugin - Auto-generated
// This plugin will create design tokens in your Figma file

const tokens = ${JSON.stringify(tokensToSync, null, 2)};

// Create a frame to hold all tokens
const frame = figma.createFrame();
frame.name = "Design Tokens";
frame.resize(800, 600);

let yPosition = 20;

tokens.forEach((token, index) => {
  // Create a text node for the token name
  const nameText = figma.createText();
  nameText.characters = token.name;
  nameText.x = 20;
  nameText.y = yPosition;
  nameText.fontSize = 16;
  frame.appendChild(nameText);

  // Create a visual representation based on token type
  if (token.type === 'color') {
    const colorRect = figma.createRectangle();
    colorRect.x = 200;
    colorRect.y = yPosition;
    colorRect.resize(40, 20);
    
    // Parse color value
    try {
      if (token.value.startsWith('#')) {
        const hex = token.value.substring(1);
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        colorRect.fills = [{type: 'SOLID', color: {r, g, b}}];
      }
    } catch (e) {
      console.error('Error parsing color:', token.value);
    }
    
    frame.appendChild(colorRect);
  }

  // Create a text node for the token value
  const valueText = figma.createText();
  valueText.characters = token.value;
  valueText.x = 260;
  valueText.y = yPosition;
  valueText.fontSize = 12;
  frame.appendChild(valueText);

  // Create a text node for the description
  if (token.description) {
    const descText = figma.createText();
    descText.characters = token.description;
    descText.x = 400;
    descText.y = yPosition;
    descText.fontSize = 10;
    frame.appendChild(descText);
  }

  yPosition += 40;
});

// Add the frame to the current page
figma.currentPage.appendChild(frame);

// Close the plugin
figma.closePlugin("Design tokens imported successfully!");
`;
  }

  const sendSlackNotification = async (tokens, action) => {
    try {
      const slackConfig = JSON.parse(localStorage.getItem('slackConfig') || '{}')
      if (slackConfig.isConnected && slackConfig.enableNotifications) {
        const slackService = createSlackService(slackConfig)
        
        switch (action) {
          case 'created':
            await slackService.notifyTokenCreated(tokens)
            break
          case 'updated':
            await slackService.notifyTokenUpdated(tokens)
            break
          case 'deleted':
            await slackService.notifyTokenDeleted(tokens)
            break
          case 'pushed':
            await slackService.notifyTokensPushed(tokens)
            break
        }
      }
    } catch (error) {
      console.error('Slack notification error:', error)
      // Don't show error to user as this is a background operation
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design Tokens</h1>
          <p className="text-gray-600">
            Manage your design system tokens. {changedTokens.size > 0 && (
              <span className="text-blue-600 font-medium">
                {changedTokens.size} token{changedTokens.size !== 1 ? 's' : ''} ready to sync
              </span>
            )}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handlePushToFigma}
            disabled={isLoading || changedTokens.size === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Figma className="h-4 w-4 mr-2" />
            Open Figma Plugin
          </button>
          
          <button
            onClick={handlePushToGithub}
            disabled={isLoading || changedTokens.size === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Github className="h-4 w-4 mr-2" />
            Push to GitHub
          </button>
          
          <button
            onClick={handleCreateToken}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Token
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-gray-900">{tokens.length}</div>
          <div className="text-sm text-gray-600">Total Tokens</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">{changedTokens.size}</div>
          <div className="text-sm text-gray-600">Pending Changes</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">
            {tokens.filter(t => t.type === 'color').length}
          </div>
          <div className="text-sm text-gray-600">Colors</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-purple-600">
            {tokens.filter(t => t.type === 'spacing').length}
          </div>
          <div className="text-sm text-gray-600">Spacing</div>
        </div>
      </div>

      {/* Token Table */}
      <div className="bg-white shadow rounded-lg">
        <TokenTable
          tokens={tokens}
          onEdit={handleEditToken}
          onDelete={handleDeleteToken}
        />
      </div>

      {/* Token Dialog */}
      <TokenDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveToken}
        editToken={editingToken}
      />
    </div>
  )
}

export default TokenManagement
