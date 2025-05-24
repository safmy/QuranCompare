# Vector Search API Deployment Guide

This guide covers how to deploy the vector search API with cloud-hosted embeddings.

## Problem: Large Vector Files

The FAISS indices and metadata files are too large (~30MB each) to store in Git. Here are solutions for hosting them in the cloud.

## Cloud Storage Options

### 1. **Cloudflare R2 (Recommended for Free Tier)**
- **Cost**: 10GB free storage, 1M requests/month free
- **Setup**:
  ```bash
  # Install Cloudflare CLI
  npm install -g wrangler
  
  # Upload files
  wrangler r2 object put your-bucket/RashadAllMedia.faiss --file=RashadAllMedia.faiss
  wrangler r2 object put your-bucket/RashadAllMedia.json --file=RashadAllMedia.json
  # Repeat for other files
  ```
- **Access**: Set public bucket or use presigned URLs
- **Environment Variables**:
  ```bash
  export RASHAD_FAISS_URL="https://your-r2-domain.com/RashadAllMedia.faiss"
  export RASHAD_JSON_URL="https://your-r2-domain.com/RashadAllMedia.json"
  # etc...
  ```

### 2. **GitHub Releases**
- **Cost**: Free
- **Limit**: 2GB per file
- **Setup**:
  1. Create a release in your GitHub repo
  2. Upload FAISS files as release assets
  3. Use direct download URLs
- **URLs**: `https://github.com/safmy/QuranCompare/releases/download/v1.0/RashadAllMedia.faiss`

### 3. **Hugging Face Hub (ML-Focused)**
- **Cost**: Free for public datasets
- **Setup**:
  ```bash
  pip install huggingface-hub
  huggingface-cli login
  
  # Create dataset repo
  huggingface-cli repo create quran-vectors --type dataset
  
  # Upload files
  huggingface-cli upload quran-vectors . --include="*.faiss" --include="*.json"
  ```
- **In API**: Use the Hugging Face loader in vector_loader.py

### 4. **AWS S3**
- **Cost**: ~$0.02/GB/month storage + transfer costs
- **Setup**:
  ```bash
  # Configure AWS CLI
  aws configure
  
  # Create bucket and upload
  aws s3 mb s3://your-quran-vectors
  aws s3 cp RashadAllMedia.faiss s3://your-quran-vectors/
  aws s3 cp RashadAllMedia.json s3://your-quran-vectors/
  # Make public or use IAM
  ```

### 5. **Google Cloud Storage**
- **Cost**: Similar to S3
- **Setup**:
  ```bash
  # Install gcloud CLI
  gsutil mb gs://your-quran-vectors
  gsutil cp *.faiss *.json gs://your-quran-vectors/
  gsutil iam ch allUsers:objectViewer gs://your-quran-vectors
  ```

### 6. **Backblaze B2**
- **Cost**: 10GB free, then $0.005/GB/month
- **Very cost-effective for larger files**

## API Deployment Options

### 1. **Railway.app (Recommended)**
- Supports Python apps
- Easy deployment from GitHub
- Environment variable management
- Free tier available

### 2. **Render.com**
- Free tier with limitations
- Auto-deploy from GitHub
- Environment secrets support

### 3. **Google Cloud Run**
- Serverless, scales to zero
- Pay per request
- Good for production

### 4. **Heroku**
- Easy deployment
- Free tier discontinued

## Step-by-Step Deployment (Railway + Cloudflare R2)

1. **Upload vectors to Cloudflare R2**:
   ```bash
   # Create R2 bucket via Cloudflare dashboard
   # Upload files using dashboard or wrangler CLI
   ```

2. **Update environment variables**:
   ```env
   OPENAI_API_KEY=your-key
   USE_CLOUD_VECTORS=true
   RASHAD_FAISS_URL=https://pub-xxx.r2.dev/RashadAllMedia.faiss
   RASHAD_JSON_URL=https://pub-xxx.r2.dev/RashadAllMedia.json
   FINAL_TESTAMENT_FAISS_URL=https://pub-xxx.r2.dev/FinalTestament.faiss
   FINAL_TESTAMENT_JSON_URL=https://pub-xxx.r2.dev/FinalTestament.json
   QURANTALK_FAISS_URL=https://pub-xxx.r2.dev/qurantalk_articles_1744655632.faiss
   QURANTALK_JSON_URL=https://pub-xxx.r2.dev/qurantalk_articles_1744655632.json
   ```

3. **Deploy to Railway**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and init
   railway login
   railway init
   
   # Deploy
   railway up
   ```

4. **Update React app**:
   - Set `REACT_APP_API_URL` in Netlify to your Railway URL

## Docker Deployment (Alternative)

Create a `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "vector_search_api:app", "--host", "0.0.0.0", "--port", "8000"]
```

Deploy to any container service (Cloud Run, ECS, etc.)

## Caching Strategy

The API includes caching to avoid re-downloading vectors:
- First run downloads from cloud
- Subsequent runs use local cache
- Cache directory: `./vector_cache/`
- Clear cache to force re-download

## Monitoring

Add these for production:
- Health check endpoint (already included)
- Logging to cloud service
- Error tracking (Sentry)
- Performance monitoring

## Security

1. **API Keys**: Never commit OpenAI keys
2. **CORS**: Configure allowed origins properly
3. **Rate Limiting**: Add rate limiting for production
4. **Authentication**: Consider adding API keys for your endpoints