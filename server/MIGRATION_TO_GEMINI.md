# Migration to Google Gemini AI Provider

## Summary

Successfully implemented a flexible AI provider system that allows switching between OpenAI and Google Gemini for the organization review analyzer. The system now defaults to Google Gemini's free tier.

## Changes Made

### 1. Configuration (`server/polar/config.py`)
- Added `AI_PROVIDER` setting (default: "openai", can be "gemini")
- Added `GOOGLE_AI_API_KEY` setting for Gemini authentication
- Added `GOOGLE_AI_MODEL` setting (default: "gemini-2.0-flash")
- Reorganized AI configuration section for clarity
- Fixed OpenAI model name from invalid "gpt-5.2-2025-12-11" to "gpt-4o-2024-12-11"

### 2. Analyzer Implementation (`server/polar/organization_review/analyzer.py`)
- Added Gemini imports: `GeminiModel`, `GeminiProvider`
- Implemented provider selection logic in `ReviewAnalyzer.__init__()`
- Added validation for API keys based on selected provider
- Added logging for provider initialization
- Made model name retrieval dynamic for usage tracking

### 3. Dependencies (`server/pyproject.toml`)
- Updated `pydantic-ai-slim` dependency from `[openai]` to `[openai,google]`
- This adds Google Gemini SDK support via the `google` extra

### 4. Environment Template (`server/.env.template`)
- Added `POLAR_AI_PROVIDER` with default "gemini"
- Added `POLAR_GOOGLE_AI_API_KEY` placeholder
- Added `POLAR_GOOGLE_AI_MODEL` with default "gemini-2.0-flash"
- Reorganized AI configuration section with clear comments

### 5. Documentation
- Created `AI_PROVIDER_SETUP.md` with complete setup instructions
- Created this migration guide

## How to Use

### Quick Start with Gemini (Free Tier)

1. Get your free API key from https://aistudio.google.com

2. Update your `.env` file:
```bash
POLAR_AI_PROVIDER=gemini
POLAR_GOOGLE_AI_API_KEY=your_api_key_here
POLAR_GOOGLE_AI_MODEL=gemini-2.0-flash
```

3. Install updated dependencies:
```bash
cd server
uv sync
```

4. Restart services:
```bash
uv run task api
uv run task worker
```

### Switching Back to OpenAI

Simply change in your `.env`:
```bash
POLAR_AI_PROVIDER=openai
POLAR_OPENAI_API_KEY=your_openai_key_here
```

Then restart services.

## Benefits

1. **Cost Savings**: Gemini free tier eliminates AI costs for development and small-scale production
2. **Flexibility**: Easy switching between providers without code changes
3. **Future-Proof**: Architecture supports adding more providers (Anthropic, etc.)
4. **No Vendor Lock-in**: Not dependent on a single AI provider

## Technical Details

### Provider Selection Logic
```python
if settings.AI_PROVIDER == "gemini":
    provider = GeminiProvider(api_key=settings.GOOGLE_AI_API_KEY)
    model = GeminiModel(settings.GOOGLE_AI_MODEL, provider=provider)
elif settings.AI_PROVIDER == "openai":
    provider = OpenAIProvider(api_key=settings.OPENAI_API_KEY)
    model = OpenAIChatModel(settings.OPENAI_MODEL, provider=provider)
```

### Error Handling
- Validates API keys at startup
- Provides clear error messages for missing configuration
- Logs provider and model information for debugging

### Backward Compatibility
- Existing OpenAI configurations continue to work
- Default provider can be set via environment variable
- No breaking changes to existing code

## Testing

To test the implementation:

1. Set up Gemini API key
2. Start the services
3. Check logs for: `review_analyzer.initialized provider=gemini model=gemini-2.0-flash`
4. Trigger an organization review to verify it works

## Gemini Free Tier Limits

- Free input and output tokens
- 1M context window
- Multimodal support
- Rate limits apply (check Google AI Studio for current limits)

## Next Steps

1. Get Gemini API key from https://aistudio.google.com
2. Update `.env` with the new configuration
3. Run `uv sync` to install Gemini dependencies
4. Restart services
5. Monitor logs to confirm Gemini is being used

## Rollback Plan

If you need to rollback to OpenAI only:

1. Change `.env`: `POLAR_AI_PROVIDER=openai`
2. Restart services
3. No code changes needed

## Support

For issues or questions:
- Check `AI_PROVIDER_SETUP.md` for detailed setup instructions
- Review logs for provider initialization messages
- Verify API keys are valid in respective dashboards
