// Figma Plugin Main Code
figma.showUI(__html__, { width: 400, height: 600 });

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'import-tokens') {
    try {
      const tokens = msg.tokens;
      
      // Create a main frame to hold all tokens
      const mainFrame = figma.createFrame();
      mainFrame.name = "Design Tokens";
      mainFrame.layoutMode = "VERTICAL";
      mainFrame.primaryAxisSizingMode = "AUTO";
      mainFrame.counterAxisSizingMode = "AUTO";
      mainFrame.paddingTop = 20;
      mainFrame.paddingBottom = 20;
      mainFrame.paddingLeft = 20;
      mainFrame.paddingRight = 20;
      mainFrame.itemSpacing = 16;
      mainFrame.fills = [{type: 'SOLID', color: {r: 0.98, g: 0.98, b: 0.98}}];

      // Group tokens by type
      const tokensByType = tokens.reduce((acc, token) => {
        if (!acc[token.type]) acc[token.type] = [];
        acc[token.type].push(token);
        return acc;
      }, {});

      // Create sections for each token type
      for (const [type, typeTokens] of Object.entries(tokensByType)) {
        const sectionFrame = figma.createFrame();
        sectionFrame.name = `${type.charAt(0).toUpperCase() + type.slice(1)} Tokens`;
        sectionFrame.layoutMode = "VERTICAL";
        sectionFrame.primaryAxisSizingMode = "AUTO";
        sectionFrame.counterAxisSizingMode = "AUTO";
        sectionFrame.paddingTop = 16;
        sectionFrame.paddingBottom = 16;
        sectionFrame.paddingLeft = 16;
        sectionFrame.paddingRight = 16;
        sectionFrame.itemSpacing = 12;
        sectionFrame.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
        sectionFrame.cornerRadius = 8;

        // Create section title
        await figma.loadFontAsync({ family: "Inter", style: "Bold" });
        const titleText = figma.createText();
        titleText.characters = `${type.charAt(0).toUpperCase() + type.slice(1)} Tokens`;
        titleText.fontSize = 18;
        titleText.fontName = { family: "Inter", style: "Bold" };
        titleText.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.1}}];
        sectionFrame.appendChild(titleText);

        // Create tokens in this section
        for (const token of typeTokens) {
          const tokenFrame = figma.createFrame();
          tokenFrame.name = token.name;
          tokenFrame.layoutMode = "HORIZONTAL";
          tokenFrame.primaryAxisSizingMode = "AUTO";
          tokenFrame.counterAxisSizingMode = "AUTO";
          tokenFrame.paddingTop = 12;
          tokenFrame.paddingBottom = 12;
          tokenFrame.paddingLeft = 12;
          tokenFrame.paddingRight = 12;
          tokenFrame.itemSpacing = 12;
          tokenFrame.fills = [{type: 'SOLID', color: {r: 0.97, g: 0.97, b: 0.97}}];
          tokenFrame.cornerRadius = 4;

          // Create visual representation based on token type
          if (token.type === 'color') {
            const colorRect = figma.createRectangle();
            colorRect.resize(32, 32);
            colorRect.cornerRadius = 4;
            
            try {
              if (token.value.startsWith('#')) {
                const hex = token.value.substring(1);
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                colorRect.fills = [{type: 'SOLID', color: {r, g, b}}];
              } else if (token.value.startsWith('rgb')) {
                // Basic RGB parsing - could be enhanced
                const values = token.value.match(/\d+/g);
                if (values && values.length >= 3) {
                  const r = parseInt(values[0]) / 255;
                  const g = parseInt(values[1]) / 255;
                  const b = parseInt(values[2]) / 255;
                  colorRect.fills = [{type: 'SOLID', color: {r, g, b}}];
                }
              }
            } catch (e) {
              console.error('Error parsing color:', token.value);
              colorRect.fills = [{type: 'SOLID', color: {r: 0.5, g: 0.5, b: 0.5}}];
            }
            
            tokenFrame.appendChild(colorRect);
          } else if (token.type === 'spacing' || token.type === 'border-radius') {
            const spacingRect = figma.createRectangle();
            const size = Math.min(Math.max(parseInt(token.value) || 16, 8), 32);
            spacingRect.resize(size, size);
            spacingRect.fills = [{type: 'SOLID', color: {r: 0.3, g: 0.6, b: 1}}];
            spacingRect.cornerRadius = token.type === 'border-radius' ? (parseInt(token.value) || 4) : 2;
            tokenFrame.appendChild(spacingRect);
          } else {
            // Default visual for other token types
            const defaultRect = figma.createRectangle();
            defaultRect.resize(32, 32);
            defaultRect.cornerRadius = 4;
            defaultRect.fills = [{type: 'SOLID', color: {r: 0.7, g: 0.7, b: 0.7}}];
            tokenFrame.appendChild(defaultRect);
          }

          // Create text info
          const textFrame = figma.createFrame();
          textFrame.layoutMode = "VERTICAL";
          textFrame.primaryAxisSizingMode = "AUTO";
          textFrame.counterAxisSizingMode = "AUTO";
          textFrame.itemSpacing = 4;
          textFrame.fills = [];

          await figma.loadFontAsync({ family: "Inter", style: "Medium" });
          const nameText = figma.createText();
          nameText.characters = token.name;
          nameText.fontSize = 14;
          nameText.fontName = { family: "Inter", style: "Medium" };
          nameText.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.1}}];
          textFrame.appendChild(nameText);

          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          const valueText = figma.createText();
          valueText.characters = token.value;
          valueText.fontSize = 12;
          valueText.fontName = { family: "Inter", style: "Regular" };
          valueText.fills = [{type: 'SOLID', color: {r: 0.4, g: 0.4, b: 0.4}}];
          textFrame.appendChild(valueText);

          if (token.description) {
            const descText = figma.createText();
            descText.characters = token.description;
            descText.fontSize = 11;
            descText.fontName = { family: "Inter", style: "Regular" };
            descText.fills = [{type: 'SOLID', color: {r: 0.6, g: 0.6, b: 0.6}}];
            textFrame.appendChild(descText);
          }

          tokenFrame.appendChild(textFrame);
          sectionFrame.appendChild(tokenFrame);
        }

        mainFrame.appendChild(sectionFrame);
      }

      // Add the main frame to the current page
      figma.currentPage.appendChild(mainFrame);

      // Center the frame in the viewport
      figma.viewport.scrollAndZoomIntoView([mainFrame]);

      figma.ui.postMessage({
        type: 'import-complete',
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

// Send initial message to UI
figma.ui.postMessage({ type: 'plugin-ready' });
