# Memory Palace Plugin for Obsidian

A powerful Obsidian plugin that synchronizes data from Markdown files to Obsidian Canvas files, creating visual memory palaces. Features automatic media fetching from Pixabay, AI image generation with Gemini, Google image search, interactive presentations, and memory testing!

## Installation

1. Download the plugin files
2. Place them in your `.obsidian/plugins/obsidian-memory-palace/` directory
3. Enable the plugin in Obsidian's settings
4. Configure your API keys in the plugin settings (all optional):
   - **Pixabay API Key** (for royalty-free media fetching)
   - **Gemini API Key** (for AI image generation)
   - **Google API Key & Search Engine ID** (for web image search)

## Usage

### 1. Prepare Your Markdown File

Add the following frontmatter to your Markdown file:

```yaml
---
canvas: path/to/your/canvas.canvas
format: M2  # Optional: specify M1 or M2, auto-detected if not specified
---
```

### 2. Format Your Memory Stations

#### M1 Format (Simple Text Only)
```markdown
station #1
text: This is the first memory station content.

station #2
text: This is the second memory station content.
```

#### M2 Format (Full Data Model)
```markdown
station #1
text: This is the main content for station 1.
association: A strong mental association to help remember.
image: path/to/image.png
audio: path/to/audio.mp3

station #2
text: Content for the second station.
association: Another helpful association.
image: pixabay(lion roaring)
video: pixabay(sunset over mountains)

station #3
text: Content for the third station.
association: A helpful association.
image: google(vintage 1950s refrigerator)

station #4
text: AI-generated imagery example.
association: Creative visual aids.
image: gemini(futuristic cityscape at sunset)
```

### 3. Media Integration

#### Pixabay Integration (Royalty-Free Media)

You can use Pixabay prompts to automatically fetch royalty-free media:

1. **Set up your API key**: Go to Plugin Settings → Memory Palace → Enter your Pixabay API key
   - Get a free API key at [https://pixabay.com/api/docs/](https://pixabay.com/api/docs/)

2. **Use Pixabay prompts in your markdown**:
   ```markdown
   station #1
   text: Remember the power of nature.
   image: pixabay(powerful lion roaring)
   video: pixabay(ocean waves crashing)
   ```

3. **Fetch media**: Open Command Palette → `Memory Palace: Fetch all Pixabay media in this file`
   - The plugin will find each prompt, search Pixabay, and show you 9 results to choose from
   - Select your preferred media, and it will be downloaded and linked automatically
   - Your prompts will be replaced with local file links like `image: ![[attachments/memory-palace/pixabay-12345.jpg]]`

#### Gemini AI Image Generation

Generate custom images using Google's AI:

1. **Set up your API key**: Go to Plugin Settings → Memory Palace → Enter your Gemini API key
   - Get a free API key at [https://ai.google.dev/](https://ai.google.dev/)

2. **Use Gemini prompts in your markdown**:
   ```markdown
   station #1
   text: Visualize abstract concepts.
   image: gemini(a clock melting like in Salvador Dali's painting)
   ```

3. **Generate images**: Open Command Palette → `Memory Palace: Generate all Gemini images in this file`
   - The plugin will generate AI images based on your descriptions
   - Images are automatically saved and linked in your markdown
   - Your prompts will be replaced with local file links like `image: ![[attachments/memory-palace/gemini-generated-12345.png]]`

#### Google Search Integration (Web Images)

**⚠️ COPYRIGHT WARNING**: This feature pulls images from the open web. These images are **NOT** royalty-free and may be subject to copyright. This tool is for personal use only, and you are responsible for respecting the copyright of any image you download.

You can use Google Search prompts to search and download web images:

1. **Set up your credentials**: Go to Plugin Settings → Memory Palace and configure:
   - **Google API Key**: Get one at [https://console.developers.google.com/](https://console.developers.google.com/)
   - **Google Programmable Search Engine ID (CX)**: Create a search engine at [https://cse.google.com](https://cse.google.com) and configure it to "Search for images on the entire web"

2. **Use Google Search prompts in your markdown**:
   ```markdown
   station #1
   text: Remember vintage appliances.
   image: google(vintage 1950s refrigerator)
   ```

3. **Fetch images**: Open Command Palette → `Memory Palace: Fetch all Google Search images in this file`
   - The plugin will search Google Images and show you 9 results to choose from
   - Select your preferred image, and it will be downloaded and linked automatically
   - Your prompts will be replaced with local file links like `image: ![[attachments/memory-palace/google-search-vintage-1950s-refrigerator-1234567.jpg]]`

### 4. Prepare Your Canvas

Create a Canvas file and add text nodes containing just the station numbers (`1`, `2`, `3`, etc.). These serve as anchor points for the plugin to attach the memory palace content.

### 5. Manual Synchronization

The plugin uses manual synchronization only. To sync your Memory Palace:

1. **Open the Command Palette**: Press `Ctrl+P` (or `Cmd+P` on Mac)
2. **Choose a sync command**:
   - `Sync Memory Palace`: Auto-detect format and sync
   - `Sync Memory Palace (M1 Format)`: Force M1 format sync
3. **Or use the keyboard shortcut**: You can assign custom hotkeys in Obsidian's settings

### 6. Presentation Mode

Launch an interactive presentation to review your memory palace:

1. **Open your memory palace markdown file**
2. **Command Palette** → `Memory Palace: Start Presentation`
3. **Navigation**:
   - `←` Previous station
   - `→` Next station  
   - `Space` Next station
   - `Enter` Reveal answer / Continue
   - `Esc` Exit presentation

**Features:**
- Full-screen immersive experience
- Canvas overview with clickable station navigation
- Shows all content: text, associations, images, and audio/video
- Beautiful, modern interface for reviewing your memory palace

### 7. Testing Mode

Test your memory with an interactive quiz mode:

1. **Open your memory palace markdown file**  
2. **Command Palette** → `Memory Palace: Start Testing`
3. **How it works**:
   - Shows only the station number initially
   - Press `Enter` to reveal the answer (station text)
   - Navigate between stations to test your recall
4. **Navigation**:
   - `←` Previous station
   - `→` Next station  
   - `Space` Next station
   - `Enter` Reveal answer / Continue  
   - `Esc` Exit testing mode

**Features:**
- Memory testing interface that hides answers initially
- Canvas overview with clickable navigation
- Progress tracking through your stations
- Minimal interface to focus on recall

## How It Works

### M1 Milestone
- Finds station blocks in your Markdown file
- Locates corresponding anchor nodes in your Canvas (text nodes with station numbers)
- Creates/updates text nodes below each anchor with the station content

### M2 Milestone
- Parses full station data (text, associations, images, videos)
- Creates separate nodes for each type of content
- Links all content nodes to the anchor node with edges
- Positions nodes in an organized layout around the anchor

### Media Integration
- **Pixabay**: Scans for `image: pixabay(query)` or `video: pixabay(query)` prompts, searches API, presents selection modal, downloads to `attachments/memory-palace/`
- **Gemini AI**: Scans for `image: gemini(description)` prompts, generates custom AI images, saves locally
- **Google Search**: Scans for `image: google(query)` prompts, searches web images, downloads selected images
- All media updates your markdown with local file links automatically

## Project Structure

```
src/
├── main.ts                    # Plugin entry point and command handling
├── MarkdownParser.ts          # Parses Markdown content (M1 & M2) + media prompts
├── CanvasManager.ts           # Manages Canvas file operations (M1 & M2)
├── PresentationView.ts        # Interactive presentation mode UI
├── TestingPresentationView.ts # Interactive memory testing mode UI
├── CanvasOverviewRenderer.ts  # Canvas overview rendering for navigation
├── ApiService.ts              # Pixabay, Gemini, and Google APIs integration
├── SelectionModal.ts          # Media selection modal UI
├── Settings.ts                # Settings tab for API configuration
└── types.ts                   # TypeScript interfaces and types
```

## Commands Available

- **Sync Memory Palace**: Sync markdown to canvas (auto-detect format)
- **Sync Memory Palace (M1 Format)**: Force M1 format sync
- **Memory Palace: Start Presentation**: Launch interactive presentation mode
- **Memory Palace: Start Testing**: Launch interactive memory testing mode
- **Memory Palace: Fetch all Pixabay media in this file**: Resolve Pixabay prompts and download royalty-free media
- **Memory Palace: Generate all Gemini images in this file**: Generate AI images using Google's Gemini API
- **Memory Palace: Fetch all Google Search images in this file**: Search and download web images (⚠️ copyright warning applies)

## Settings

All API keys are optional, but required for their respective features:

- **Pixabay API Key**: Required for automatic royalty-free media fetching from Pixabay
- **Gemini API Key**: Required for AI image generation using Google's Gemini API  
- **Google API Key**: Required for Google image search functionality
- **Google Programmable Search Engine ID (CX)**: Required for Google image search functionality

## Development

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. Run `npm run build` to build for production

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License
