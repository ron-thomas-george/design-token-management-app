// Simple API endpoint for serving tokens to external integrations
export const createTokenAPI = (tokens) => {
  return {
    '/api/tokens': {
      method: 'GET',
      handler: () => {
        return {
          success: true,
          data: tokens,
          count: tokens.length,
          timestamp: new Date().toISOString()
        }
      }
    }
  }
}

// Mock server for development - in production this would be a real API
export const startMockServer = (tokens, port = 3001) => {
  console.log(`Mock API server would start on port ${port}`)
  console.log('Available endpoints:')
  console.log(`  GET http://localhost:${port}/api/tokens - Returns all tokens`)
  
  // In a real implementation, this would start an Express server
  return {
    url: `http://localhost:${port}`,
    endpoints: {
      tokens: `/api/tokens`
    }
  }
}
