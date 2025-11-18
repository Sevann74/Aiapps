# Anthropic API Configuration for Course Builder

## Issue

The Course Builder's AI-powered course generation requires an Anthropic API key to function. This key must be configured as a **Supabase Edge Function secret**.

## Error Message

If you see this error:
```
ANTHROPIC_API_KEY is not configured
Failed to parse response: I cannot generate compliance quiz questions because the verified facts were not provided.
```

This means the Anthropic API key has not been set up in your Supabase project.

## Solution

You need to configure the `ANTHROPIC_API_KEY` secret in your Supabase project. There are two ways to do this:

### Option 1: Using Supabase Dashboard (Recommended)

1. **Get your Anthropic API Key**
   - Go to https://console.anthropic.com/
   - Sign in or create an account
   - Navigate to "API Keys" section
   - Create a new API key or copy your existing one
   - **Important**: Save this key securely - you won't be able to see it again!

2. **Configure in Supabase**
   - Go to your Supabase project dashboard: https://supabase.com/dashboard/project/sxdwrscyynssuqcpicxo
   - Navigate to **Edge Functions** in the left sidebar
   - Click on the **Secrets** tab or **Configuration** section
   - Add a new secret:
     - **Name**: `ANTHROPIC_API_KEY`
     - **Value**: Your Anthropic API key (starts with `sk-ant-api03-...`)
   - Click **Save** or **Add Secret**

3. **Verify the Configuration**
   - The edge function will automatically use this secret
   - No code changes or redeployment needed
   - Try generating a course again

### Option 2: Using Supabase CLI (For Developers)

If you have the Supabase CLI installed:

```bash
# Set the secret
supabase secrets set ANTHROPIC_API_KEY="your-api-key-here"

# Verify it's set
supabase secrets list
```

## Cost Information

### Anthropic API Pricing (as of 2024)
- **Claude 3.5 Sonnet**: ~$3 per million input tokens, ~$15 per million output tokens
- **Typical course generation**:
  - Fact extraction: ~1,000-3,000 tokens input, ~500-1,000 tokens output
  - Question generation: ~2,000-3,000 tokens input, ~1,500-2,000 tokens output
  - Module generation: ~2,000-4,000 tokens input, ~1,000-2,000 tokens output
  - **Total per course**: ~$0.05 - $0.15 per course generation

### Budget Management
- Set usage limits in your Anthropic console
- Monitor usage in the Anthropic dashboard
- Consider implementing request quotas for users if needed

## Testing the Configuration

After setting up the API key:

1. Go to the Course Builder app
2. Upload a test PDF document
3. Click "Generate Course"
4. You should see:
   - "Extracting facts from document..."
   - "Generating quiz questions..."
   - "Verifying accuracy..."
   - "Building course structure..."

If you still see errors, check:
- The API key is correctly copied (no extra spaces)
- The secret name is exactly `ANTHROPIC_API_KEY` (case-sensitive)
- Your Anthropic account has credits/billing configured

## Alternative: Using OpenAI Instead

If you prefer to use OpenAI instead of Anthropic, you would need to:
1. Modify the edge function to use OpenAI's API
2. Change the API endpoint and request format
3. Update the model name to GPT-4 or GPT-3.5-turbo
4. Set `OPENAI_API_KEY` as a Supabase secret instead

Contact your developer if you want to switch to OpenAI.

## Security Notes

- **NEVER** commit API keys to Git or include them in your code
- API keys should only be stored as Supabase Edge Function secrets
- Supabase secrets are encrypted and never exposed to the client
- The edge function acts as a secure proxy between your frontend and Anthropic

## Troubleshooting

### "Cannot establish connection"
- Check your internet connection
- Verify the Supabase project is active
- Check if Anthropic API is experiencing outages: https://status.anthropic.com/

### "Invalid API key"
- Verify the key starts with `sk-ant-api03-`
- Make sure you copied the entire key
- Try generating a new API key in Anthropic console

### "Rate limit exceeded"
- You've hit Anthropic's rate limits
- Wait a few minutes and try again
- Consider upgrading your Anthropic plan for higher limits

### "Insufficient credits"
- Add payment method in Anthropic console
- Check your billing settings
- Ensure you have available credits

## Support

If you continue to have issues:
1. Check the Supabase Edge Function logs in your dashboard
2. Check the browser console for detailed error messages
3. Verify the edge function is deployed correctly
4. Contact your development team for assistance

---

**Once configured, course generation will work seamlessly with AI-powered content extraction and quiz generation!**
