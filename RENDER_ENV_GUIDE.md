# Setting Environment Variables in Render

## Step-by-Step Guide

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click on your Web Service** (NOT the account settings)
3. **In the service page, find "Environment" in the left sidebar**
4. **Add Environment Variables**:

### Required Environment Variables:

```
OPENAI_API_KEY = sk-proj-...your-openai-api-key...
USE_CLOUD_VECTORS = true
```

### Optional (if not using defaults):

```
RASHAD_FAISS_URL = https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.faiss
RASHAD_JSON_URL = https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.json
FINAL_TESTAMENT_FAISS_URL = https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/FinalTestament.faiss
FINAL_TESTAMENT_JSON_URL = https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/FinalTestament.json
QURANTALK_FAISS_URL = https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/qurantalk_articles_1744655632.faiss
QURANTALK_JSON_URL = https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/qurantalk_articles_1744655632.json
```

## Getting Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)
4. Paste it as the value for `OPENAI_API_KEY` in Render

## Common Mistakes

- ❌ Don't use Render's "API Keys" section (that's for Render's API)
- ❌ Don't forget to save after adding variables
- ❌ Don't include quotes around the values
- ✅ DO use the "Environment" section in your service
- ✅ DO redeploy after adding variables

## After Setting Variables

1. Click "Save" in the Environment section
2. Render will automatically redeploy your service
3. Check the logs to ensure it starts correctly
4. Test your API endpoint: `https://your-service.onrender.com/health`