// Enhanced Figma Plugin with Supabase Integration
figma.showUI(__html__, { width: 450, height: 700 });

// Store for tracking token changes
let lastTokenSync = null;
let currentTokens = [];
let supabaseConfig = null;

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'configure-supabase') {
    supabaseConfig = {
      url: msg.supabaseUrl,
      key: msg.supabaseKey
    };
    
    // Test connection
    try {
      const tokens = await fetchTokensFromSupabase();
      figma.ui.postMessage({ 
        type: 'supabase-configured', 
        success: true,
        tokenCount: tokens.length 
      });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'supabase-configured', 
        success: false,
        error: error.message 
      });
    }
  }

  if (msg.type === 'fetch-tokens') {
    try {
      let tokens = [];
      
      if (supabaseConfig) {
        // Fetch directly from Supabase
        tokens = await fetchTokensFromSupabase();
      } else {
        // Fallback to API endpoint
        const response = await fetch('https://design-token-management-app.vercel.app/api/tokens');
        if (!response.ok) {
          throw new Error('Failed to fetch tokens from API');
        }
        tokens = await response.json();
      }
      
      figma.ui.postMessage({ type: 'tokens-fetched', tokens });
    } catch (error) {
      console.error('Error fetching tokens:', error);
      figma.ui.postMessage({ 
        type: 'error', 
        message: 'Could not fetch tokens: ' + error.message 
      });
    }
  }

  if (msg.type === 'check-changes') {
    try {
      const tokens = supabaseConfig ? 
        await fetchTokensFromSupabase() : 
        await fetchTokensFromAPI();
      
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
      
      await createTokensVisualization(tokens);
      
      figma.ui.postMessage({ 
        type: 'success', 
        message: `Successfully imported ${tokens.length} design tokens!` 
      });

    } catch (error) {
      console.error('Error importing tokens:', error);
      figma.ui.postMessage({
        type: 'import-error',
        message: 'Error importing tokens: ' + error.message
      });
    }
  } else if (msg.type === 'close-plugin') {
    figma.closePlugin();
  }
};

// Fetch tokens directly from Supabase
async function fetchTokensFromSupabase() {
  if (!supabaseConfig) {
    throw new Error('Supabase not configured');
  }

  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/design_tokens?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseConfig.key,
        'Authorization': `Bearer ${supabaseConfig.key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Supabase fetch error:', error);
    throw new Error(`Failed to connect to Supabase: ${error.message}`);
  }
}

// Fallback API fetch
async function fetchTokensFromAPI() {
  const response = await fetch('https://design-token-management-app.vercel.app/api/tokens');
  if (!response.ok) {
    throw new Error('Failed to fetch from API');
  }
  return await response.json();
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
    node.type === 'FRAME' && node.name === 'Design Tokens'
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
  mainFrame.name = "Design Tokens";
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
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    typeHeader.fontName = { family: "Inter", style: "Bold" };
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
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  timestamp.fontName = { family: "Inter", style: "Regular" };
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
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  nameText.fontName = { family: "Inter", style: "Medium" };
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
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  valueText.fontName = { family: "Inter", style: "Regular" };
  valueText.fontSize = 12;
  valueText.characters = token.value;
  valueText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  
  tokenFrame.appendChild(valueText);
  valueText.x = 320;
  valueText.y = 14;

  // Description if available
  if (token.description) {
    const descText = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    descText.fontName = { family: "Inter", style: "Regular" };
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
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    textSample.fontName = { family: "Inter", style: "Regular" };
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
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    genericText.fontName = { family: "Inter", style: "Regular" };
    genericText.fontSize = 12;
    genericText.characters = "●";
    genericText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    
    return genericText;
  }
}

// Enhanced color parser
function parseColor(colorValue) {
  if (colorValue.startsWith('#')) {
    const hex = colorValue.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return { r, g, b };
  }
  
  if (colorValue.startsWith('rgb')) {
    const matches = colorValue.match(/\d+/g);
    if (matches && matches.length >= 3) {
      return {
        r: parseInt(matches[0]) / 255,
        g: parseInt(matches[1]) / 255,
        b: parseInt(matches[2]) / 255
      };
    }
  }
  
  // Handle named colors
  const namedColors = {
    'red': { r: 1, g: 0, b: 0 },
    'blue': { r: 0, g: 0, b: 1 },
    'green': { r: 0, g: 1, b: 0 },
    'black': { r: 0, g: 0, b: 0 },
    'white': { r: 1, g: 1, b: 1 }
  };
  
  return namedColors[colorValue.toLowerCase()] || { r: 0.5, g: 0.5, b: 0.5 };
}

// Send initial message to UI
figma.ui.postMessage({ type: 'plugin-ready' });
