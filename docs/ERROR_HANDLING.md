# Error Handling Documentation

## Overview

This application implements comprehensive error handling for OpenAI API interactions and other potential failures.

## OpenAI API Key Validation

### Environment Setup

The application requires a valid OpenAI API key to function. Set it in your `.env.local` file:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

### Validation Flow

1. **Early Validation**: API key is validated at the start of each request
2. **Format Check**: Keys must start with `sk-` prefix
3. **Existence Check**: Key must be present in environment variables

### Error Types

The application handles the following error scenarios:

#### API Key Errors

- **`API_KEY_MISSING`**: No API key found in environment
  - Status: 500
  - Message: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables."
  - Retryable: No

- **`API_KEY_INVALID`**: API key format is invalid or authentication failed
  - Status: 401/500
  - Message: "Invalid OpenAI API key. Please check your configuration."
  - Retryable: No

#### API Errors

- **`RATE_LIMIT`**: Too many requests to OpenAI API
  - Status: 429
  - Message: "Rate limit exceeded. Please wait a moment and try again."
  - Retryable: Yes

- **`TOKEN_LIMIT`**: Message exceeds token limits
  - Status: 400
  - Message: "Message is too long. Please try a shorter message."
  - Retryable: No

- **`NETWORK_ERROR`**: Connection or server errors
  - Status: 500+
  - Message: "Server error. Please try again in a moment."
  - Retryable: Yes

- **`TIMEOUT`**: Request timeout
  - Status: 504
  - Message: "Request timed out. Please try again."
  - Retryable: Yes

## User Interface

### Error Display

Errors are displayed at the top of the chat interface with:

- Alert icon for visual emphasis
- Error title: "Unable to send message"
- Detailed error message
- Additional help text for API key errors

### Example Error Display

```
⚠️ Unable to send message
   OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.
   Please check your environment configuration and ensure OPENAI_API_KEY is set correctly.
```

## Error Handler Utility

### Location

`lib/error-handler.ts`

### Key Functions

#### `validateOpenAIKey()`

Validates that the OpenAI API key is configured and properly formatted.

```typescript
import { validateOpenAIKey } from '@/lib/error-handler';

try {
  validateOpenAIKey();
} catch (error) {
  // Handle validation error
}
```

#### `parseAPIError(error)`

Converts raw errors into structured `APIError` instances.

```typescript
import { parseAPIError } from '@/lib/error-handler';

try {
  // API call
} catch (error) {
  const apiError = parseAPIError(error);
  console.log(apiError.message);
  console.log(apiError.type);
  console.log(apiError.retryable);
}
```

#### `getUserFriendlyErrorMessage(error)`

Extracts user-friendly error messages.

```typescript
import { getUserFriendlyErrorMessage } from '@/lib/error-handler';

const message = getUserFriendlyErrorMessage(error);
```

## API Route Error Handling

### Location

`app/api/chat/route.ts`

### Flow

1. Validate OpenAI API key
2. Validate request format
3. Process chat request
4. Handle streaming errors
5. Return structured error responses

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "type": "api_key_missing",
  "retryable": false
}
```

## Testing Error Scenarios

### Missing API Key

1. Remove or comment out `OPENAI_API_KEY` from `.env.local`
2. Restart the dev server: `npm run dev`
3. Navigate to `/test-ai-chat`
4. Send a message
5. Verify error is displayed

### Invalid API Key

1. Set `OPENAI_API_KEY=invalid-key` in `.env.local`
2. Restart the dev server
3. Send a message
4. Verify authentication error is displayed

### Rate Limiting

Rate limiting errors are handled automatically with proper error messages.

## Best Practices

1. **Never expose API keys**: Keys are validated server-side only
2. **User-friendly messages**: All errors show helpful guidance
3. **Retry logic**: Retryable errors are marked appropriately
4. **Logging**: All errors are logged for debugging
5. **Type safety**: Use TypeScript types for error handling

## Troubleshooting

### "OpenAI API key is not configured"

**Solution**:
1. Create `.env.local` file in project root
2. Add `OPENAI_API_KEY=sk-your-key-here`
3. Restart dev server

### "Invalid OpenAI API key format"

**Solution**:
1. Verify key starts with `sk-`
2. Check for extra spaces or newlines
3. Get a new key from OpenAI dashboard if needed

### Errors not displaying in UI

**Solution**:
1. Check browser console for JavaScript errors
2. Verify `useChat` hook is properly configured
3. Ensure error state is being passed to UI component

## Future Enhancements

- [ ] Retry mechanism with exponential backoff
- [ ] Error analytics and reporting
- [ ] Custom error pages
- [ ] Offline mode detection
- [ ] API key rotation support
