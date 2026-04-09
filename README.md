![Plugin Banner](assets/baner.png)

# AI Editor Blocks

AI-powered blocks for the WordPress Gutenberg editor. Generate content, create interactive components, and enhance your editing workflow with artificial intelligence.

**Support Development**: If you find this plugin useful, consider [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K81SQ00B)

---

## Features

### AI Block Generation
- **AI Gen Block**: A dedicated block that allows you to generate content using AI. Simply provide a prompt and let the AI create content directly in your editor.
- **Customizable API**: Configure your own AI API endpoint (OpenAI-compatible) with your API key and model selection.

### Interactive Components
- **Sliders**: Create beautiful, responsive image/content sliders with ease.
- **Tabs**: Organize content into tabbed interfaces for better user experience.
- **Accordions**: Create collapsible content sections perfect for FAQs and organized content.

### AI Edit Button for Core Blocks
- Enhance core WordPress blocks with an AI edit button that allows you to modify block content using AI prompts.
- Works seamlessly with the existing Gutenberg editor interface.

## Requirements

- WordPress 6.0 or higher
- PHP 7.4 or higher
- Node.js 16+ and npm (for building from source)
- An AI API key (OpenAI or compatible API)

## Installation

### From ZIP File
1. Download the latest release ZIP file.
2. Go to **WordPress Admin → Plugins → Add New → Upload Plugin**.
3. Upload the ZIP file and click **Install Now**.
4. Activate the plugin.

### From Source (Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/3xryuk/ai-editor-blocks.git
   cd ai-editor-blocks
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Copy the entire folder to your WordPress `wp-content/plugins/` directory.

5. Activate the plugin in WordPress Admin → Plugins.

## Configuration

### Setting Up the API

1. Go to **WordPress Admin → Settings → AI Editor Blocks**.
2. Configure the following settings:
   - **API URL**: The endpoint for your AI API (default: `https://api.openai.com/v1/chat/completions`).
   - **API Key**: Your API key for authentication.
   - **Model Name**: The AI model to use (e.g., `gpt-4o`, `gpt-3.5-turbo`).

3. Click **Save Settings** to store your configuration.

### Using a Custom API Endpoint

This plugin supports any OpenAI-compatible API. Simply change the API URL to your custom endpoint and provide the appropriate API key.

## Usage

### Using the AI Gen Block

1. In the Gutenberg editor, click the **+** button to add a new block.
2. Search for **"AI Gen Blocks"** or find it in the Widgets category.
3. Add the block to your content.
4. Enter your prompt in the block's input field.
5. Click the generate button to create AI-powered content.

### Using Interactive Blocks

#### Sliders
1. Add a Slider block from the block inserter.
2. Add images or content to each slide.
3. Customize slider settings in the block sidebar.

#### Tabs
1. Add a Tabs block from the block inserter.
2. Add individual tab items and label them.
3. Add content to each tab panel.

#### Accordions
1. Add an Accordion block from the block inserter.
2. Add accordion items with titles and content.
3. Configure expand/collapse behavior in the block settings.

### Using the AI Edit Button

1. Select any supported core block in the editor.
2. Look for the AI edit button in the block toolbar.
3. Enter your modification prompt.
4. The AI will update the block content based on your instructions.

## File Structure

```
ai-editor-blocks/
├── ai-editor-blocks.php      # Main plugin file
├── package.json              # Node.js dependencies and scripts
├── src/                      # Source files
│   ├── block.json            # Block metadata
│   ├── index.js              # Block registration
│   ├── edit.js               # Block edit component
│   ├── save.js               # Block save component
│   ├── editor.scss           # Editor styles
│   ├── style.scss            # Frontend styles
│   └── extensions/           # Block extensions
│       ├── block-ai-edit.js  # AI edit button for blocks
│       └── group-interactive.js # Interactive components
├── includes/                 # PHP classes
│   ├── class-aieb-settings.php    # Settings page
│   ├── class-aieb-api-proxy.php   # API proxy for frontend
│   └── class-aieb-interactive-blocks.php # Interactive blocks logic
├── assets/                   # Static assets
│   ├── css/                  # Stylesheets
│   └── js/                   # JavaScript files
└── build/                    # Compiled files (generated)
```

## Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start development mode with hot reload
npm start

# Run linting
npm run lint

# Format code
npm run format
```

## Security Considerations

- API keys are stored in the WordPress database. Ensure your database is secure.
- The API proxy endpoint is protected by WordPress nonce verification and capability checks.
- Only users with appropriate permissions can access the settings and API functionality.

## Support

- **GitHub Issues**: [https://github.com/3xryuk/ai-editor-blocks/issues](https://github.com/3xryuk/ai-editor-blocks/issues)
- **Documentation**: [https://github.com/3xryuk/ai-editor-blocks/wiki](https://github.com/3xryuk/ai-editor-blocks/wiki)

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- Built with [WordPress Gutenberg](https://wordpress.org/gutenberg/)
- Uses the [WordPress Scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/) package for build tooling

