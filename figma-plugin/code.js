// Enhanced Figma Plugin with Supabase Integration
figma.showUI(__html__, { width: 450, height: 700 });

// Store for tracking token changes
let lastTokenSync = null;
let currentTokens = [];
let lastFigmaVariablesSnapshot = null;
let userApiKey = null;

// Initialize plugin on load
initializePlugin();

async function initializePlugin() {
  // Load stored API key
  userApiKey = await figma.clientStorage.getAsync('userApiKey');
  
  // Initialize the Figma variables snapshot on plugin load
  await initializeFigmaVariablesSnapshot();
  
  figma.ui.postMessage({ 
    type: 'plugin-initialized', 
    success: true, 
    message: 'Plugin ready - using API endpoint for tokens',
    hasApiKey: !!userApiKey
  });
}

figma.ui.onmessage = async (msg) => {

  if (msg.type === 'fetch-tokens') {
    try {
      let tokens = [];
      
      // Try API endpoint only - no fallback
      tokens = await fetchTokensFromAPI();
      figma.ui.postMessage({ type: 'tokens-fetched', tokens });
      currentTokens = tokens;
      
    } catch (error) {
      console.error('Error fetching tokens:', error);
      figma.ui.postMessage({ type: 'error', message: `Could not fetch tokens: ${error.message}` });
    }
  }

  if (msg.type === 'check-changes') {
    try {
      let tokens = [];
      
      // Use same fallback logic as fetch-tokens
      try {
        tokens = await fetchTokensFromAPI();
      } catch (apiError) {
        if (supabaseConfig) {
          tokens = await fetchTokensFromSupabase();
        } else {
          throw apiError;
        }
      }
      
      const changes = detectTokenChanges(currentTokens, tokens);
      currentTokens = tokens;
      
      figma.ui.postMessage({ 
        type: 'changes-detected', 
        changes,
        totalTokens: tokens.length 
      });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'error', 
        message: 'Failed to check for changes: ' + error.message 
      });
    }
  }

  if (msg.type === 'sync-changes') {
    try {
      const tokens = supabaseConfig ? 
        await fetchTokensFromSupabase() : 
        await fetchTokensFromAPI();
      
      const changes = detectTokenChanges(currentTokens, tokens);
      
      if (changes.added.length > 0 || changes.modified.length > 0 || changes.deleted.length > 0) {
        await updateTokensInFigma(tokens, changes);
        currentTokens = tokens;
        
        figma.ui.postMessage({ 
          type: 'sync-complete', 
          changes,
          message: `Synced ${changes.added.length + changes.modified.length} changes` 
        });
      } else {
        figma.ui.postMessage({ 
          type: 'sync-complete', 
          changes,
          message: 'No changes to sync' 
        });
      }
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'error', 
        message: 'Failed to sync changes: ' + error.message 
      });
    }
  }

  if (msg.type === 'import-tokens') {
    try {
      const tokens = msg.tokens;
      currentTokens = tokens;
      
      // Create both variables and visualization
      const { created, updated } = await createTokenVariables(tokens);
      await createTokensVisualization(tokens);
      
      figma.ui.postMessage({ 
        type: 'success', 
        message: `Successfully imported ${tokens.length} tokens (${created} created, ${updated} updated) as variables and visualization!`,
        counts: { created, updated }
      });

    } catch (error) {
      console.error('Error importing tokens:', error);
      figma.ui.postMessage({
        type: 'import-error',
        message: 'Error importing tokens: ' + error.message
      });
    }
  } else if (msg.type === 'create-variables-only') {
    try {
      const tokens = msg.tokens;
      currentTokens = tokens;
      
      const { created, updated } = await createTokenVariables(tokens);
      
      figma.ui.postMessage({ 
        type: 'success', 
        message: `Successfully processed ${tokens.length} tokens (${created} created, ${updated} updated)!`,
        counts: { created, updated }
      });

    } catch (error) {
      console.error('Error creating variables:', error);
      figma.ui.postMessage({
        type: 'import-error',
        message: 'Error creating variables: ' + error.message
      });
    }
  } else if (msg.type === 'push-variables-to-app') {
    try {
      const currentFigmaTokens = await extractFigmaVariables();
      
      if (currentFigmaTokens.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'No Fragmento variables found in Figma to push'
        });
        return;
      }

      // Compare with last snapshot to detect changes
      const changes = detectFigmaVariableChanges(lastFigmaVariablesSnapshot, currentFigmaTokens);
      
      if (changes.added.length === 0 && changes.modified.length === 0 && changes.deleted.length === 0) {
        figma.ui.postMessage({
          type: 'success',
          message: 'No changes detected - nothing to push'
        });
        return;
      }

      // Only push changed tokens (using concat instead of spread operator)
      const tokensToSync = changes.added.concat(changes.modified);
      
      if (tokensToSync.length > 0) {
        await pushTokensToApp(tokensToSync);
      }
      
      // Handle deletions if needed (could be implemented later)
      // For now, we'll just sync additions and modifications
      
      // Update snapshot after successful push
      lastFigmaVariablesSnapshot = currentFigmaTokens;
      
      const changeCount = changes.added.length + changes.modified.length + changes.deleted.length;
      figma.ui.postMessage({
        type: 'success',
        message: `Successfully pushed ${changeCount} changes (${changes.added.length} added, ${changes.modified.length} modified, ${changes.deleted.length} deleted)`
      });

    } catch (error) {
      console.error('Error pushing variables to app:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Error pushing variables to app: ' + error.message
      });
    }
  } else if (msg.type === 'save-api-key') {
    try {
      userApiKey = msg.apiKey;
      await figma.clientStorage.setAsync('userApiKey', userApiKey);
      
      figma.ui.postMessage({
        type: 'success',
        message: 'API key saved successfully'
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to save API key: ' + error.message
      });
    }
  } else if (msg.type === 'clear-api-key') {
    try {
      userApiKey = null;
      await figma.clientStorage.deleteAsync('userApiKey');
      
      figma.ui.postMessage({
        type: 'success',
        message: 'API key cleared successfully'
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to clear API key: ' + error.message
      });
    }
  } else if (msg.type === 'close-plugin') {
    figma.closePlugin();
  }
};

// Fetch tokens directly from Supabase
async function fetchTokensFromSupabase() {
  console.log('Fetching tokens from Supabase...');
  
  if (!supabaseConfig) {
    const error = new Error('Supabase not configured');
    console.error(error);
    throw error;
  }

  const requestUrl = `${supabaseConfig.url}/rest/v1/design_tokens?select=*&order=created_at.desc`;
  const requestOptions = {
    method: 'GET',
    headers: {
      'apikey': supabaseConfig.key,
      'Authorization': `Bearer ${supabaseConfig.key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  // Create headers object for logging (without sensitive data)
  const logHeaders = Object.assign({}, requestOptions.headers);
  logHeaders['apikey'] = '[REDACTED]';
  logHeaders['Authorization'] = '[REDACTED]';
  
  console.log('Sending request to Supabase:', requestUrl);
  console.log('Request headers:', JSON.stringify(logHeaders));

  let response;
  try {
    response = await fetch(requestUrl, requestOptions);
    console.log('Received response with status:', response.status);
  } catch (fetchError) {
    console.error('Network fetch error:', {
      name: fetchError.name,
      message: fetchError.message,
      stack: fetchError.stack
    });
    throw new Error(`Network error: ${fetchError.message}`);
  }

  // Handle non-2xx responses
  if (!response.ok) {
    let errorDetails = '';
    try {
      const errorData = await response.json().catch(() => ({}));
      errorDetails = errorData.message || errorData.error || JSON.stringify(errorData);
    } catch (e) {
      errorDetails = await response.text().catch(() => 'Could not parse error details');
    }
    
    console.error('Supabase error response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      details: errorDetails
    });
    
    const errorMap = {
      401: 'Authentication failed. Please check your Supabase credentials.',
      403: 'Access denied. You do not have permission to access these tokens.',
      404: 'Tokens endpoint not found. Please check your Supabase URL.',
      500: 'Supabase server error. Please try again later.'
    };
    
    throw new Error(errorMap[response.status] || `Supabase error: ${response.status} ${response.statusText}`);
  }

  // Parse and validate response
  try {
    const result = await response.json();
    console.log('Raw Supabase response:', JSON.stringify(result, null, 2));
    
    // Supabase returns an array directly or an object with a 'data' property
    const tokens = Array.isArray(result) 
      ? result 
      : (result && Array.isArray(result.data) ? result.data : []);
    
    console.log(`Found ${tokens.length} tokens in Supabase response`);
    
    // Filter out invalid tokens
    const validTokens = [];
    const invalidTokens = [];
    
    for (const token of tokens) {
      if (token && 
          typeof token === 'object' && 
          'name' in token && 
          'value' in token && 
          'type' in token) {
        validTokens.push(token);
      } else {
        console.warn('Skipping invalid token format from Supabase:', token);
        invalidTokens.push(token);
      }
    }
    
    if (invalidTokens.length > 0) {
      console.warn(`Filtered out ${invalidTokens.length} invalid tokens from Supabase`);
    }
    
    console.log(`Successfully processed ${validTokens.length} valid tokens from Supabase`);
    return validTokens;
    
  } catch (error) {
    console.error('Supabase fetch error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Rethrow with more context
    error.message = `Failed to fetch tokens from Supabase: ${error.message}`;
    throw error;
  }
}


// Extract Figma variables and convert to token format
async function extractFigmaVariables() {
  const figmaTokens = [];
  
  try {
    // Get all local variable collections asynchronously
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    
    // Filter for Fragmento collections
    const fragmentoCollections = collections.filter(collection => 
      collection.name && collection.name.startsWith('Fragmento - ')
    );
  
    for (const collection of fragmentoCollections) {
      // Extract token type from collection name (e.g., "Fragmento - Colors" -> "colors")
      const type = collection.name.replace('Fragmento - ', '').toLowerCase();
      
      // Get all variables in this collection asynchronously
      const variablePromises = collection.variableIds.map(id => 
        figma.variables.getVariableByIdAsync(id)
      );
      const variables = (await Promise.all(variablePromises)).filter(Boolean);
      
      for (const variable of variables) {
        // Get the default mode value
        const modes = Object.keys(variable.valuesByMode);
        if (modes.length === 0) continue;
        
        const defaultMode = modes[0];
        const value = variable.valuesByMode[defaultMode];
        
        // Convert Figma value to token format
        let tokenValue = convertFigmaValueToToken(value, type);
        
        if (tokenValue !== null) {
          figmaTokens.push({
            name: variable.name,
            value: tokenValue,
            type: type,
            description: variable.description || `${type} token from Figma`
          });
        }
      }
    }
    
    return figmaTokens;
  } catch (error) {
    console.error('Error extracting Figma variables:', error);
    figma.notify('Error extracting variables. See console for details.');
    return [];
  }
}

// Convert Figma variable values to token format
function convertFigmaValueToToken(value, type) {
  if (typeof value === 'object' && value !== null) {
    // Handle color values (RGB objects)
    if ('r' in value && 'g' in value && 'b' in value) {
      const r = Math.round(value.r * 255);
      const g = Math.round(value.g * 255);
      const b = Math.round(value.b * 255);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  
  // Handle numeric values (spacing, border-radius, etc.)
  if (typeof value === 'number') {
    return `${value}px`;
  }
  
  // Handle string values
  if (typeof value === 'string') {
    return value;
  }
  
  return null;
}

// Detect changes between Figma variable snapshots
function detectFigmaVariableChanges(previousSnapshot, currentTokens) {
  const changes = {
    added: [],
    modified: [],
    deleted: []
  };

  // If no previous snapshot, all current tokens are new
  if (!previousSnapshot || previousSnapshot.length === 0) {
    changes.added = currentTokens.slice(); // Create a shallow copy of the array
    return changes;
  }

  // Create maps for easier comparison
  const previousMap = new Map(previousSnapshot.map(token => [token.name, token]));
  const currentMap = new Map(currentTokens.map(token => [token.name, token]));

  // Find added and modified tokens
  for (const [name, currentToken] of currentMap) {
    const previousToken = previousMap.get(name);
    
    if (!previousToken) {
      // Token is new
      changes.added.push(currentToken);
    } else if (JSON.stringify(previousToken) !== JSON.stringify(currentToken)) {
      // Token exists but has changed
      changes.modified.push(currentToken);
    }
  }

  // Find deleted tokens
  for (const [name, previousToken] of previousMap) {
    if (!currentMap.has(name)) {
      changes.deleted.push(previousToken);
    }
  }

  return changes;
}

// Initialize snapshot on first variable extraction
async function initializeFigmaVariablesSnapshot() {
  if (!lastFigmaVariablesSnapshot) {
    lastFigmaVariablesSnapshot = await extractFigmaVariables();
  }
}

// Push tokens to the app via API
async function pushTokensToApp(tokens) {
  console.log('Pushing tokens to app...');
  
  if (!userApiKey) {
    const error = new Error('API key is required to push tokens');
    console.error('No API key available');
    throw error;
  }

  const requestUrl = 'https://design-token-management-app.vercel.app/api/tokens';
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': userApiKey,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ tokens })
  };

  // Create headers object for logging (without sensitive data)
  const logHeaders = Object.assign({}, requestOptions.headers);
  logHeaders['X-API-Key'] = '[REDACTED]';
  
  console.log('Sending request to:', requestUrl);
  console.log('Request headers:', JSON.stringify(logHeaders));
  console.log('Token count being sent:', tokens.length);

  let response;
  try {
    response = await fetch(requestUrl, requestOptions);
    console.log('Received response with status:', response.status);
  } catch (fetchError) {
    console.error('Network fetch error:', {
      name: fetchError.name,
      message: fetchError.message,
      stack: fetchError.stack
    });
    throw new Error(`Network error: ${fetchError.message}`);
  }

  // Handle non-2xx responses
  if (!response.ok) {
    let errorDetails = '';
    try {
      const errorData = await response.json().catch(() => ({}));
      errorDetails = errorData.message || errorData.error || JSON.stringify(errorData);
    } catch (e) {
      errorDetails = await response.text().catch(() => 'Could not parse error details');
    }
    
    console.error('API error response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      details: errorDetails
    });
    
    const errorMap = {
      400: 'Invalid token data. Please check the token format and try again.',
      401: 'Authentication failed. Please check your API key and try again.',
      403: 'Access denied. You do not have permission to update these tokens.',
      500: 'Server error. Please try again later.'
    };
    
    throw new Error(errorMap[response.status] || `API error: ${response.status} ${response.statusText}`);
  }

  // Parse and validate response
  try {
    const data = await response.json();
    console.log('Successfully pushed tokens to app');
    return data;
  } catch (parseError) {
    console.error('Failed to parse API response:', {
      error: parseError,
      responseText: await response.text().catch(() => 'Could not read response text')
    });
    throw new Error('Failed to parse server response');
  }
}

// Fetch tokens from the API endpoint
async function fetchTokensFromAPI() {
  console.log('Fetching tokens from API...');
  
  try {
    // Basic validation
    if (!userApiKey) {
      const error = new Error('API key is required to fetch tokens');
      console.error('No API key available');
      throw error;
    }

    console.log('Using API key for authentication');
    
    // Prepare request
    const requestUrl = 'https://design-token-management-app.vercel.app/api/tokens';
    const requestOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': userApiKey
      }
    };

    console.log('Sending request to:', requestUrl);
    console.log('Request headers:', JSON.stringify(requestOptions.headers));
    
    let response;
    try {
      response = await fetch(requestUrl, requestOptions);
      console.log('Received response with status:', response.status);
    } catch (fetchError) {
      console.error('Network fetch error:', {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack
      });
      throw new Error(`Network error: ${fetchError.message}`);
    }
    
    // Handle non-2xx responses
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json().catch(() => ({}));
        errorDetails = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch (e) {
        errorDetails = await response.text().catch(() => 'Could not parse error details');
      }
      
      console.error('API error response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
        details: errorDetails
      });
      
      // Provide user-friendly error messages
      const errorMap = {
        401: 'Authentication failed. Please check your API key and try again.',
        403: 'Access denied. You do not have permission to access these tokens.',
        404: 'Tokens endpoint not found. The server may be misconfigured.',
        500: 'Server error. Please try again later.'
      };
      
      throw new Error(errorMap[response.status] || `API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse and validate response
    try {
      const result = await response.json();
      console.log('Raw API response:', JSON.stringify(result, null, 2));
      
      // The API returns tokens in a 'tokens' property
      const tokens = result && result.tokens && Array.isArray(result.tokens) 
        ? result.tokens 
        : [];
      
      console.log(`Found ${tokens.length} tokens in response`);
      
      // Filter out invalid tokens
      const validTokens = [];
      const invalidTokens = [];
      
      for (const token of tokens) {
        if (token && 
            typeof token === 'object' && 
            'name' in token && 
            'value' in token && 
            'type' in token) {
          validTokens.push(token);
        } else {
          console.warn('Skipping invalid token format from API:', token);
          invalidTokens.push(token);
        }
      }
      
      if (invalidTokens.length > 0) {
        console.warn(`Filtered out ${invalidTokens.length} invalid tokens`);
      }
      
      console.log(`Successfully processed ${validTokens.length} valid tokens from API`);
      return validTokens;
      
    } catch (parseError) {
      console.error('Failed to parse API response:', {
        error: parseError,
        responseText: await response.text().catch(() => 'Could not read response text')
      });
      throw new Error('Failed to parse server response');
    }
    
  } catch (error) {
    console.error('API fetch error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause
    });
    
    // Provide more user-friendly error messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    
    // Re-throw with more context if needed
    if (!error.message.includes('API error')) {
      error.message = `Failed to fetch tokens: ${error.message}`;
    }
    
    throw error;
  }
}

// Detect changes between token sets
function detectTokenChanges(oldTokens, newTokens) {
  const oldTokensMap = new Map(oldTokens.map(t => [t.id, t]));
  const newTokensMap = new Map(newTokens.map(t => [t.id, t]));
  
  const added = [];
  const modified = [];
  const deleted = [];
  
  // Check for added and modified tokens
  for (const [id, newToken] of newTokensMap) {
    const oldToken = oldTokensMap.get(id);
    if (!oldToken) {
      added.push(newToken);
    } else if (JSON.stringify(oldToken) !== JSON.stringify(newToken)) {
      modified.push({ old: oldToken, new: newToken });
    }
  }
  
  // Check for deleted tokens
  for (const [id, oldToken] of oldTokensMap) {
    if (!newTokensMap.has(id)) {
      deleted.push(oldToken);
    }
  }
  
  return { added, modified, deleted };
}

// Update tokens in Figma based on changes
async function updateTokensInFigma(tokens, changes) {
  // Find existing token frame or create new one
  let tokenFrame = figma.currentPage.findOne(node => 
    node.type === 'FRAME' && node.name === 'Fragmento Tokens'
  );
  
  if (!tokenFrame) {
    await createTokensVisualization(tokens);
    return;
  }
  
  // Update existing frame with changes
  if (changes.added.length > 0 || changes.modified.length > 0 || changes.deleted.length > 0) {
    // Remove old content and recreate
    tokenFrame.remove();
    await createTokensVisualization(tokens);
  }
}

// Create comprehensive tokens visualization
async function createTokensVisualization(tokens) {
  // Create main frame for all tokens
  const mainFrame = figma.createFrame();
  mainFrame.name = "Fragmento Tokens";
  mainFrame.resize(900, 700);
  mainFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
  mainFrame.cornerRadius = 8;
  
  // Position main frame
  mainFrame.x = figma.viewport.center.x - 450;
  mainFrame.y = figma.viewport.center.y - 350;

  let currentY = 30;
  const groupSpacing = 80;
  const tokenSpacing = 50;

  // Group tokens by type
  const tokensByType = tokens.reduce((acc, token) => {
    if (!acc[token.type]) acc[token.type] = [];
    acc[token.type].push(token);
    return acc;
  }, {});

  // Create sections for each token type
  for (const [type, typeTokens] of Object.entries(tokensByType)) {
    // Create type header with background
    const headerBg = figma.createRectangle();
    headerBg.resize(860, 40);
    headerBg.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    headerBg.cornerRadius = 6;
    mainFrame.appendChild(headerBg);
    headerBg.x = 20;
    headerBg.y = currentY;
    
    const typeHeader = figma.createText();
    await figma.loadFontAsync({ family: "Poppins", style: "Bold" });
    typeHeader.fontName = { family: "Poppins", style: "Bold" };
    typeHeader.fontSize = 16;
    typeHeader.characters = `${type.charAt(0).toUpperCase() + type.slice(1)} (${typeTokens.length})`;
    typeHeader.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    
    mainFrame.appendChild(typeHeader);
    typeHeader.x = 35;
    typeHeader.y = currentY + 12;
    
    currentY += 60;

    // Create tokens for this type
    for (const token of typeTokens) {
      const tokenFrame = await createEnhancedTokenVisualization(token);
      mainFrame.appendChild(tokenFrame);
      tokenFrame.x = 40;
      tokenFrame.y = currentY;
      
      currentY += tokenSpacing;
    }
    
    currentY += groupSpacing - tokenSpacing;
  }

  // Adjust main frame height based on content
  mainFrame.resize(900, Math.max(700, currentY + 30));

  // Add timestamp
  const timestamp = figma.createText();
  await figma.loadFontAsync({ family: "Poppins", style: "Regular" });
  timestamp.fontName = { family: "Poppins", style: "Regular" };
  timestamp.fontSize = 10;
  timestamp.characters = `Last updated: ${new Date().toLocaleString()}`;
  timestamp.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
  
  mainFrame.appendChild(timestamp);
  timestamp.x = 40;
  timestamp.y = currentY + 10;

  // Select the main frame
  figma.currentPage.selection = [mainFrame];
  figma.viewport.scrollAndZoomIntoView([mainFrame]);
}

// Enhanced token visualization
async function createEnhancedTokenVisualization(token) {
  const tokenFrame = figma.createFrame();
  tokenFrame.name = token.name;
  tokenFrame.resize(820, 40);
  tokenFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  tokenFrame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  tokenFrame.strokeWeight = 1;
  tokenFrame.cornerRadius = 6;

  // Token name
  const nameText = figma.createText();
  await figma.loadFontAsync({ family: "Poppins", style: "Medium" });
  nameText.fontName = { family: "Poppins", style: "Medium" };
  nameText.fontSize = 14;
  nameText.characters = token.name;
  nameText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  
  tokenFrame.appendChild(nameText);
  nameText.x = 16;
  nameText.y = 13;

  // Token value visualization
  let valueElement = await createTokenValueElement(token);
  tokenFrame.appendChild(valueElement);
  valueElement.x = 280;
  valueElement.y = token.type === 'color' ? 8 : 13;

  // Token value text
  const valueText = figma.createText();
  await figma.loadFontAsync({ family: "Poppins", style: "Regular" });
  valueText.fontName = { family: "Poppins", style: "Regular" };
  valueText.fontSize = 12;
  valueText.characters = token.value;
  valueText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  
  tokenFrame.appendChild(valueText);
  valueText.x = 320;
  valueText.y = 14;

  // Description if available
  if (token.description) {
    const descText = figma.createText();
    await figma.loadFontAsync({ family: "Poppins", style: "Regular" });
    descText.fontName = { family: "Poppins", style: "Regular" };
    descText.fontSize = 10;
    descText.characters = token.description;
    descText.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
    
    tokenFrame.appendChild(descText);
    descText.x = 520;
    descText.y = 16;
  }

  return tokenFrame;
}

// Create appropriate visual element for token value
async function createTokenValueElement(token) {
  if (token.type === 'color') {
    const colorSwatch = figma.createRectangle();
    colorSwatch.resize(24, 24);
    colorSwatch.cornerRadius = 4;
    
    const color = parseColor(token.value);
    colorSwatch.fills = [{ type: 'SOLID', color }];
    colorSwatch.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    colorSwatch.strokeWeight = 1;
    
    return colorSwatch;
  } else if (token.type === 'typography') {
    const textSample = figma.createText();
    await figma.loadFontAsync({ family: "Poppins", style: "Regular" });
    textSample.fontName = { family: "Poppins", style: "Regular" };
    textSample.fontSize = 14;
    textSample.characters = "Aa";
    textSample.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    
    return textSample;
  } else if (token.type === 'spacing') {
    const spacingBox = figma.createRectangle();
    const size = Math.min(parseInt(token.value) || 16, 24);
    spacingBox.resize(size, size);
    spacingBox.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.7, b: 1 } }];
    spacingBox.cornerRadius = 2;
    
    return spacingBox;
  } else {
    const genericText = figma.createText();
    await figma.loadFontAsync({ family: "Poppins", style: "Regular" });
    genericText.fontName = { family: "Poppins", style: "Regular" };
    genericText.fontSize = 12;
    genericText.characters = "●";
    genericText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    
    return genericText;
  }
}

// Enhanced color parser with validation
function parseColor(colorValue) {
  if (!colorValue || typeof colorValue !== 'string') {
    return { r: 0.5, g: 0.5, b: 0.5 }; // Default gray
  }

  if (colorValue.startsWith('#')) {
    const hex = colorValue.slice(1);
    
    // Handle 3-digit hex (e.g., #f0a)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b };
      }
    }
    
    // Handle 6-digit hex (e.g., #ff00aa)
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b };
      }
    }
  }
  
  if (colorValue.startsWith('rgb')) {
    const matches = colorValue.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = parseInt(matches[0]) / 255;
      const g = parseInt(matches[1]) / 255;
      const b = parseInt(matches[2]) / 255;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b };
      }
    }
  }
  
  // Handle named colors
  const namedColors = {
    'red': { r: 1, g: 0, b: 0 },
    'blue': { r: 0, g: 0, b: 1 },
    'green': { r: 0, g: 1, b: 0 },
    'black': { r: 0, g: 0, b: 0 },
    'white': { r: 1, g: 1, b: 1 },
    'gray': { r: 0.5, g: 0.5, b: 0.5 },
    'grey': { r: 0.5, g: 0.5, b: 0.5 }
  };
  
  const namedColor = namedColors[colorValue.toLowerCase()];
  if (namedColor) {
    return namedColor;
  }
  
  // Fallback to gray for invalid colors
  console.warn(`Invalid color value: ${colorValue}, using fallback gray`);
  return { r: 0.5, g: 0.5, b: 0.5 };
}

// Create Figma variables from tokens
async function createTokenVariables(tokens) {
  try {
    // Group tokens by type for better organization
    const tokensByType = tokens.reduce((acc, token) => {
      if (!acc[token.type]) acc[token.type] = [];
      acc[token.type].push(token);
      return acc;
    }, {});

    // Get all existing Fragmento variables for cleanup
    const allVariables = await figma.variables.getLocalVariablesAsync();
    const existingVariables = [];
    
    // We need to check each variable's collection asynchronously
    for (const variable of allVariables) {
      try {
        const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
        if (collection && collection.name.startsWith('Fragmento - ')) {
          existingVariables.push(variable);
        }
      } catch (error) {
        console.warn(`Error checking variable collection for ${variable.name}:`, error);
      }
    }

    // Create a set of current token names for quick lookup
    const currentTokenNames = new Set(tokens.map(token => token.name));

    // Remove variables that no longer exist in the token list
    for (const variable of existingVariables) {
      if (!currentTokenNames.has(variable.name)) {
        console.log(`Removing deleted variable: ${variable.name}`);
        variable.remove();
      }
    }

    // Create or get variable collections for each token type
    const collections = {};
    let variablesCreated = 0;
    let variablesUpdated = 0;
    
    for (const [type, typeTokens] of Object.entries(tokensByType)) {
      // Create collection for this token type
      const collectionName = `Fragmento - ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      
      // Check if collection already exists
      const allCollections = await figma.variables.getLocalVariableCollectionsAsync();
      let collection = allCollections.find(c => c.name === collectionName);
      
      if (!collection) {
        collection = figma.variables.createVariableCollection(collectionName);
      }
      
      collections[type] = collection;
      
      // Create variables for each token in this type
      for (const token of typeTokens) {
        const result = await createVariableForToken(token, collection);
        if (result === 'created') variablesCreated++;
        else if (result === 'updated') variablesUpdated++;
      }
    }
    
    console.log(`Processed ${variablesCreated + variablesUpdated} variables (${variablesCreated} created, ${variablesUpdated} updated) in ${Object.keys(collections).length} collections`);
    
    // Return the actual counts for accurate reporting
    return { created: variablesCreated, updated: variablesUpdated };
    
  } catch (error) {
    console.error('Error creating variables:', error);
    throw error;
  }
}

// Create a Figma variable for a specific token
async function createVariableForToken(token, collection) {
  try {
    // Check if variable already exists
    const allVariables = await figma.variables.getLocalVariablesAsync();
    const existingVariable = allVariables.find(v => 
      v.name === token.name && v.variableCollectionId === collection.id
    );
    
    let variable;
    
    let wasCreated = false;
    if (existingVariable) {
      variable = existingVariable;
    } else {
      // Determine variable type based on token type
      const variableType = getVariableTypeForToken(token);
      variable = figma.variables.createVariable(token.name, collection, variableType);
      wasCreated = true;
    }
    
    // Set variable description
    if (token.description) {
      variable.description = token.description;
    }
    
    // Set variable value based on token type
    const value = parseTokenValueForVariable(token);
    const defaultMode = collection.modes[0];
    
    variable.setValueForMode(defaultMode.modeId, value);
    
    // Return whether this was a new variable or an update
    return wasCreated ? 'created' : 'updated';
    
    console.log(`Created/updated variable: ${token.name} = ${token.value}`);
    
  } catch (error) {
    console.error(`Error creating variable for token ${token.name}:`, error);
    // This plugin needs to fetch tokens from the deployed Fragmento application completely
  }
}

// Get appropriate Figma variable type for token
function getVariableTypeForToken(token) {
  switch (token.type) {
    case 'color':
      return 'COLOR';
    case 'spacing':
    case 'border-radius':
      return 'FLOAT';
    case 'typography':
    case 'shadow':
    default:
      return 'STRING';
  }
}

// Parse token value for Figma variable
function parseTokenValueForVariable(token) {
  switch (token.type) {
    case 'color':
      return parseColorForVariable(token.value);
    
    case 'spacing':
    case 'border-radius':
      return parseNumericValue(token.value);
    
    case 'typography':
    case 'shadow':
    default:
      return token.value; // Return as string
  }
}

// Parse color value for Figma variable
function parseColorForVariable(colorValue) {
  if (!colorValue || typeof colorValue !== 'string') {
    return { r: 0.5, g: 0.5, b: 0.5, a: 1 }; // Default gray
  }

  if (colorValue.startsWith('#')) {
    const hex = colorValue.slice(1);
    
    // Handle 3-digit hex
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b, a: 1 };
      }
    }
    
    // Handle 6-digit hex
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b, a: 1 };
      }
    }
    
    // Handle 8-digit hex (with alpha)
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
        return { r, g, b, a };
      }
    }
  }
  
  if (colorValue.startsWith('rgb')) {
    const matches = colorValue.match(/[\d.]+/g);
    if (matches && matches.length >= 3) {
      const r = parseFloat(matches[0]) / 255;
      const g = parseFloat(matches[1]) / 255;
      const b = parseFloat(matches[2]) / 255;
      const a = matches.length > 3 ? parseFloat(matches[3]) : 1;
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a)) {
        return { r, g, b, a };
      }
    }
  }
  
  // Handle named colors
  const namedColors = {
    'red': { r: 1, g: 0, b: 0, a: 1 },
    'blue': { r: 0, g: 0, b: 1, a: 1 },
    'green': { r: 0, g: 1, b: 0, a: 1 },
    'black': { r: 0, g: 0, b: 0, a: 1 },
    'white': { r: 1, g: 1, b: 1, a: 1 },
    'gray': { r: 0.5, g: 0.5, b: 0.5, a: 1 },
    'grey': { r: 0.5, g: 0.5, b: 0.5, a: 1 }
  };
  
  const namedColor = namedColors[colorValue.toLowerCase()];
  if (namedColor) {
    return namedColor;
  }
  
  // Fallback to gray
  console.warn(`Invalid color value: ${colorValue}, using fallback gray`);
  return { r: 0.5, g: 0.5, b: 0.5, a: 1 };
}

// Parse numeric values (spacing, border-radius)
function parseNumericValue(value) {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Extract number from string (e.g., "16px" -> 16)
    const numMatch = value.match(/([\d.]+)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      if (!isNaN(num)) {
        return num;
      }
    }
  }
  
  // Fallback to 0
  console.warn(`Invalid numeric value: ${value}, using fallback 0`);
  return 0;
}

// Send initial message to UI
figma.ui.postMessage({ type: 'plugin-ready' });
