# AI Provider Configuration Guide

The organization review system supports multiple AI providers for flexibility and cost optimization.

## Supported Providers

### 1. Google Gemini (Free Tier) - Recommended for Development
- **Provider ID**: `gemini`
- **Cost**: Free tier with generous limits
- **Models**: 
  - `gemini-2.0-flash` (recommended - fastest)
  - `gemini-2.5-flash` (balanced)
  - `gemini-2.5-pro` (most capable)
- **Features**: 1M context window, multimodal support, free input/output tokens

### 2. OpenAI
- **Provider ID**: `openai`
- **Cost**: Pay-per-use
- **Models**: `gpt-4o-2024-12-11` (default)
- **Features**: High quality, proven performance

## Setup Instructions

### Using Google Gemini (Free Tier)

1. **Get API Key**:
   - Visit https://aistudio.google.com
   - Sign in with your Google account
   - Click "Get API Key" and create a new key

2. **Configure Environment**:
   ```bash
   # In your .env file
   POLAR_AI_PROVIDER=gemini
   POLAR_GOOGLE_AI_API_KEY=your_api_key_here
   POLAR_GOOGLE_AI_MODEL=gemini-2.0-flash
   ```

3. **Restart Services**:
   ```bash
   # Stop running services (Ctrl+C)
   # Then restart
   uv run task api
   uv run task worker
   ```

### Using OpenAI

1. **Get API Key**:
   - Visit https://platform.openai.com/api-keys
   - Create a new API key

2. **Configure Environment**:
   ```bash
   # In your .env file
   POLAR_AI_PROVIDER=openai
   POLAR_OPENAI_API_KEY=your_api_key_here
   POLAR_OPENAI_MODEL=gpt-4o-2024-12-11
   ```

3. **Restart Services**:
   ```bash
   # Stop running services (Ctrl+C)
   # Then restart
   uv run task api
   uv run task worker
   ```

## Switching Between Providers

You can switch providers anytime by changing the `POLAR_AI_PROVIDER` environment variable:

```bash
# Switch to Gemini
POLAR_AI_PROVIDER=gemini

# Switch to OpenAI
POLAR_AI_PROVIDER=openai
```

After changing, restart your services for the change to take effect.

## Model Selection

### Gemini Models
- **gemini-2.0-flash**: Fastest, best for high-volume reviews (recommended)
- **gemini-2.5-flash**: Balanced speed and quality
- **gemini-2.5-pro**: Most capable, slower but higher quality

### OpenAI Models
- **gpt-4o-2024-12-11**: Latest GPT-4o model (default)
- Other models can be configured via `POLAR_OPENAI_MODEL`

## Troubleshooting

### Error: "GOOGLE_AI_API_KEY is required"
- Make sure you've set `POLAR_GOOGLE_AI_API_KEY` in your .env file
- Verify the API key is valid at https://aistudio.google.com

### Error: "OPENAI_API_KEY is required"
- Make sure you've set `POLAR_OPENAI_API_KEY` in your .env file
- Verify the API key is valid at https://platform.openai.com

### Error: "Unsupported AI_PROVIDER"
- Check that `POLAR_AI_PROVIDER` is set to either "openai" or "gemini"
- Provider names are case-insensitive

## Cost Comparison

| Provider | Cost | Best For |
|----------|------|----------|
| Gemini Free Tier | $0 | Development, testing, small-scale production |
| OpenAI GPT-4o | Pay-per-use | Production with budget |

## Implementation Details

The system uses a provider abstraction layer that:
- Automatically selects the correct provider based on `AI_PROVIDER` setting
- Validates API keys at startup
- Logs provider and model information for debugging
- Supports easy addition of new providers in the future

See `server/polar/organization_review/analyzer.py` for implementation details.
