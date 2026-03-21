# Google Gemini Quick Start

## 3-Step Setup

### Step 1: Get API Key
Visit https://aistudio.google.com and create a free API key

### Step 2: Configure .env
```bash
POLAR_AI_PROVIDER=gemini
POLAR_GOOGLE_AI_API_KEY=your_key_here
POLAR_GOOGLE_AI_MODEL=gemini-2.0-flash
```

### Step 3: Install & Restart
```bash
cd server
uv sync
uv run task api    # Terminal 1
uv run task worker # Terminal 2
```

## Verify It's Working
Check logs for:
```
review_analyzer.initialized provider=gemini model=gemini-2.0-flash
```

## Switch Back to OpenAI
```bash
POLAR_AI_PROVIDER=openai
```
Then restart services.

## Free Tier Models
- `gemini-2.0-flash` - Fastest (recommended)
- `gemini-2.5-flash` - Balanced
- `gemini-2.5-pro` - Most capable

## Cost
✅ **FREE** - No charges for Gemini free tier usage

## Support
See `AI_PROVIDER_SETUP.md` for detailed documentation
