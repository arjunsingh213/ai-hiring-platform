# Setup Instructions: Unstructured API Key

## Add API Key to .env

Open `server/.env` and add the following line:

```env
UNSTRUCTURED_API_KEY=HplXUl9bh61HEgjk5EE7kimFAg0oZP
```

## Alternative: Unstructured Free Tier API

If you want to use Unstructured's free hosted API instead:

```env
# Option 1: Use your provided API key (recommended)
UNSTRUCTURED_API_KEY=HplXUl9bh61HEgjk5EE7kimFAg0oZP

# Option 2: Or use Unstructured free API (if key doesn't work)
# UNSTRUCTURED_API_KEY=your_free_tier_key_from_unstructured.io
```

## Restart Server

After adding the API key, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Test Resume Upload

1. Go to onboarding: `http://localhost:5173/onboarding/jobseeker`
2. Click "Upload Resume"
3. Select a PDF or DOCX resume
4. Check server logs for:
   - `[UnstructuredParser] Starting PDF parsing...`
   - `[Resume] Text extraction complete. Length: XXX characters`
   - `[Resume] Calling LLama 3.1 for AI skill extraction...`

## Troubleshooting

### If you see "Failed to parse PDF with Unstructured"
- Check API key is correct in `.env`
- Verify server was restarted after adding key
- Check server logs for detailed error message

### If text extraction works but AI parsing fails
- This is OK! The OpenRouter credits issue is separate
- Resume will still be saved with basic data
- User can proceed with onboarding

## What Changed

- **PDF Parsing**: Now uses Unstructured API (better quality)
- **DOCX Parsing**: Still uses Mammoth (unchanged)
- **Processing**: Buffer-based (Vercel/serverless compatible)
- **Manual Flow**: Completely untouched
