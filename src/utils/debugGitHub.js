// Debug utility for GitHub integration
export const debugGitHubPush = async (tokens, config) => {
  console.log('=== GitHub Push Debug ===')
  console.log('Tokens to push:', tokens)
  console.log('Config (token hidden):', { ...config, token: config.token ? '[SET]' : '[MISSING]' })
  
  // Test basic GitHub API connectivity
  try {
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (response.ok) {
      const repoData = await response.json()
      console.log('✅ GitHub API connection successful')
      console.log('Repository:', repoData.full_name)
      console.log('Default branch:', repoData.default_branch)
      return { success: true, repoData }
    } else {
      console.error('❌ GitHub API connection failed:', response.status, response.statusText)
      const errorData = await response.text()
      console.error('Error details:', errorData)
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }
  } catch (error) {
    console.error('❌ GitHub API request failed:', error)
    return { success: false, error: error.message }
  }
}

export const testGitHubAuth = async (config) => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (response.ok) {
      const userData = await response.json()
      console.log('✅ GitHub authentication successful')
      console.log('Authenticated as:', userData.login)
      return { success: true, user: userData.login }
    } else {
      console.error('❌ GitHub authentication failed:', response.status)
      return { success: false, error: `Authentication failed: ${response.status}` }
    }
  } catch (error) {
    console.error('❌ GitHub auth request failed:', error)
    return { success: false, error: error.message }
  }
}
