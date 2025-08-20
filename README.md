# Token Management System

A comprehensive design token management platform with Figma plugin integration and GitHub/Slack connectivity.

## Features

### 🎨 Token Management
- Create, edit, and delete design tokens
- Support for multiple token types: colors, typography, spacing, border radius, and shadows
- Real-time validation and preview
- State tracking for changed tokens

### 🔌 Figma Integration
- Complete Figma plugin for importing tokens
- Visual token representation in Figma frames
- Organized by token types
- Auto-generated plugin code download

### 🚀 GitHub Integration
- Push tokens to GitHub repositories
- Automatic pull request creation
- JSON file format for tokens
- Branch management and merging

### 📢 Slack Notifications
- Real-time notifications for token changes
- Configurable notification types
- Webhook-based integration
- Rich message formatting

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- GitHub personal access token (for GitHub integration)
- Slack webhook URL (for Slack integration)

### Installation

1. **Clone and install dependencies:**
```bash
cd /Users/ronthomasgeorge/CascadeProjects/token-management-system
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to `http://localhost:3000`

## Usage

### Creating Tokens

1. Click the **"Create Token"** button
2. Fill in the token details:
   - **Name**: Unique identifier for the token
   - **Type**: Select from color, typography, spacing, border-radius, or shadow
   - **Value**: The actual value (e.g., `#3B82F6`, `16px`, `0 4px 6px rgba(0,0,0,0.1)`)
   - **Description**: Optional detailed description

3. Click **"Create Token"** to save

### Managing Tokens

- **Edit**: Click the context menu (⋮) next to any token and select "Edit"
- **Delete**: Click the context menu (⋮) and select "Delete"
- **View**: All tokens are displayed in a sortable table with previews

### Figma Integration

1. **Push tokens to Figma:**
   - Make changes to your tokens
   - Click **"Push to Figma"** button
   - Download the generated plugin file
   
2. **Install the Figma plugin:**
   - Open Figma
   - Go to Plugins → Development → Import plugin from manifest
   - Select the downloaded plugin files from `figma-plugin/` directory
   
3. **Use the plugin:**
   - Run the "Design Token Importer" plugin in Figma
   - Enter your API URL (default: `http://localhost:3000/api/tokens`)
   - Click "Fetch Tokens" and then "Import to Figma"

### GitHub Integration

1. **Configure GitHub:**
   - Go to the **Integrations** tab
   - Enter your GitHub personal access token
   - Specify repository owner and name
   - Set the target branch (defaults to 'main')
   - Click **"Verify Connection"**

2. **Push tokens:**
   - Make changes to your tokens
   - Click **"Push to GitHub"**
   - Tokens will be saved as `tokens.json` in your repository
   - A pull request will be created if pushing to a non-default branch

### Slack Integration

1. **Configure Slack:**
   - Go to the **Integrations** tab
   - Enter your Slack webhook URL
   - Specify channel name (optional)
   - Enable notifications and select notification types
   - Click **"Test Connection"**

2. **Automatic notifications:**
   - Token creation, updates, and deletions
   - GitHub push notifications
   - Configurable notification preferences

## File Structure

```
token-management-system/
├── src/
│   ├── components/
│   │   ├── TokenManagement.jsx    # Main token management interface
│   │   ├── TokenDialog.jsx        # Token creation/editing dialog
│   │   ├── TokenTable.jsx         # Token display table
│   │   └── Integrations.jsx       # GitHub/Slack configuration
│   ├── services/
│   │   ├── githubService.js       # GitHub API integration
│   │   └── slackService.js        # Slack webhook integration
│   ├── api/
│   │   └── tokenApi.js            # API endpoints for external access
│   └── App.jsx                    # Main application component
├── figma-plugin/
│   ├── manifest.json              # Figma plugin manifest
│   ├── code.js                    # Plugin main code
│   └── ui.html                    # Plugin UI interface
└── package.json
```

## Token Format

Tokens are stored in the following JSON format:

```json
{
  "tokens": {
    "color": {
      "primary-blue": {
        "value": "#3B82F6",
        "description": "Primary brand color",
        "type": "color"
      }
    },
    "spacing": {
      "spacing-md": {
        "value": "16px",
        "description": "Medium spacing value",
        "type": "spacing"
      }
    }
  },
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2023-08-20T07:48:29.000Z",
    "totalTokens": 2
  }
}
```

## API Endpoints

- `GET /api/tokens` - Returns all tokens in JSON format
- Used by the Figma plugin to fetch current tokens

## Configuration

### GitHub Setup
1. Create a personal access token with `repo` permissions
2. Note your repository owner/organization name
3. Note your repository name
4. Choose target branch (creates PR if different from default)

### Slack Setup
1. Create an incoming webhook in your Slack workspace
2. Copy the webhook URL
3. Optionally specify a channel name
4. Configure notification preferences

## Development

### Building for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Troubleshooting

### Common Issues

1. **GitHub push fails:**
   - Verify your personal access token has `repo` permissions
   - Check repository owner/name spelling
   - Ensure the repository exists and you have write access

2. **Slack notifications not working:**
   - Verify webhook URL is correct
   - Check that notifications are enabled in settings
   - Test the connection using the "Test Connection" button

3. **Figma plugin not loading tokens:**
   - Ensure the development server is running
   - Check the API URL in the plugin matches your server
   - Verify CORS settings if running on different ports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
