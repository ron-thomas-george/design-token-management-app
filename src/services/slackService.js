import axios from 'axios'

class SlackService {
  constructor(config) {
    this.config = config
  }

  async sendNotification(message, options = {}) {
    if (!this.config.webhookUrl || !this.config.enableNotifications) {
      return { success: false, reason: 'Notifications disabled or webhook not configured' }
    }

    try {
      const payload = {
        text: message,
        username: 'Fragmento',
        icon_emoji: ':art:',
        ...options
      }

      if (this.config.channelName) {
        payload.channel = this.config.channelName
      }

      // Use fetch with no-cors mode to avoid CORS preflight issues
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // This prevents CORS preflight requests
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      // Note: With no-cors mode, we can't read the response status or body
      // We assume success if no error is thrown
      return { success: true, message: 'Notification sent (no-cors mode)' }
    } catch (error) {
      console.error('Slack notification error:', error)
      return { success: false, error: error.message }
    }
  }

  async testConnection() {
    return this.sendNotification('Fragmento - Connection test successful! 🎉')
  }

  formatTokenNotification(tokens, action) {
    const tokenCount = tokens.length
    const tokenTypes = [...new Set(tokens.map(t => t.type))]
    
    let emoji = '🎨'
    let actionText = 'updated'
    
    switch (action) {
      case 'created':
        emoji = '✨'
        actionText = 'created'
        break
      case 'updated':
        emoji = '🔄'
        actionText = 'updated'
        break
      case 'deleted':
        emoji = '🗑️'
        actionText = 'deleted'
        break
      case 'pushed':
        emoji = '🚀'
        actionText = 'pushed to GitHub'
        break
    }

    let message = `${emoji} *${tokenCount} design token${tokenCount !== 1 ? 's' : ''} ${actionText}*\n\n`
    
    if (tokenCount <= 5) {
      // Show individual tokens for small changes
      tokens.forEach(token => {
        message += `• *${token.name}* (${token.type}): \`${token.value}\`\n`
      })
    } else {
      // Show summary for large changes
      message += `*Types affected:* ${tokenTypes.join(', ')}\n`
    }
    
    if (action === 'pushed') {
      message += '\n_Check your GitHub repository for the latest changes._'
    }
    
    return message
  }

  async notifyTokenCreated(tokens) {
    if (!this.config.notifyOnNewTokens) return { success: false, reason: 'New token notifications disabled' }
    
    const message = this.formatTokenNotification(tokens, 'created')
    return this.sendNotification(message)
  }

  async notifyTokenUpdated(tokens) {
    if (!this.config.notifyOnUpdates) return { success: false, reason: 'Update notifications disabled' }
    
    const message = this.formatTokenNotification(tokens, 'updated')
    return this.sendNotification(message)
  }

  async notifyTokenDeleted(tokens) {
    if (!this.config.notifyOnDeletions) return { success: false, reason: 'Deletion notifications disabled' }
    
    const message = this.formatTokenNotification(tokens, 'deleted')
    return this.sendNotification(message)
  }

  async notifyTokensPushed(tokens, destination = 'GitHub') {
    const message = this.formatTokenNotification(tokens, 'pushed')
    return this.sendNotification(message)
  }

  async notifyError(error, context = '') {
    const message = `❌ *Error in Fragmento*\n\n${context ? `*Context:* ${context}\n` : ''}*Error:* ${error.message || error}`
    return this.sendNotification(message)
  }
}

export const createSlackService = (config) => {
  return new SlackService(config)
}

export default SlackService
