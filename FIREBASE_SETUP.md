# Firebase Setup Guide

## Prerequisites

1. Firebase project created at https://console.firebase.google.com
2. Google Cloud SDK installed (for CORS configuration)
3. Service account key downloaded

## Step 1: Configure Environment Variables

Update `.env.local` with your Firebase configuration:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 2: Add Service Account Key

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the downloaded JSON file as `serviceAccountKey.json` in the project root
4. This file is already in `.gitignore` and will not be committed

## Step 3: Enable Firebase Services

In Firebase Console:

1. **Authentication:**
   - Go to Authentication > Sign-in method
   - Enable "Anonymous" provider
   - (Optional) Enable "Google" provider for persistent accounts

2. **Firestore Database:**
   - Go to Firestore Database > Create database
   - Start in production mode
   - Choose your preferred location

3. **Storage:**
   - Go to Storage > Get started
   - Start in production mode
   - Choose the same location as Firestore

## Step 4: Deploy Security Rules

### Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Or manually copy the contents of `firestore.rules` to Firebase Console > Firestore Database > Rules

### Storage Rules

```bash
firebase deploy --only storage
```

Or manually copy the contents of `storage.rules` to Firebase Console > Storage > Rules

## Step 5: Configure CORS for Storage

Firebase Storage requires CORS configuration to allow requests from localhost during development.

### Install Google Cloud SDK

If not already installed:
- macOS: `brew install google-cloud-sdk`
- Windows/Linux: https://cloud.google.com/sdk/docs/install

### Authenticate

```bash
gcloud auth login
```

### Set CORS Configuration

```bash
gsutil cors set cors.json gs://YOUR-BUCKET-NAME.firebasestorage.app
```

Replace `YOUR-BUCKET-NAME` with your actual Firebase Storage bucket name (found in Firebase Console > Storage).

### Verify CORS Configuration

```bash
gsutil cors get gs://YOUR-BUCKET-NAME.firebasestorage.app
```

## Step 6: Test Configuration

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000/firebase-test`
3. Click "Sign In Anonymously"
4. Click "Run All Tests"
5. Verify all tests pass (Auth, Firestore, Storage)

## Troubleshooting

### CORS Errors

If you see CORS errors in the Storage test:
- Make sure you ran `gsutil cors set cors.json gs://YOUR-BUCKET-NAME`
- Verify the bucket name is correct
- Check that `cors.json` exists in the project root

### Permission Denied Errors

- Check that security rules are deployed
- Verify the user is authenticated
- Check that the storage bucket name matches in rules and configuration

### Environment Variables Not Loading

- Make sure `.env.local` exists and has correct values
- Restart the development server after changing environment variables
- Check that variable names start with `NEXT_PUBLIC_` for client-side access

## Production Deployment

When deploying to production:

1. Update `cors.json` to include your production domain:
   ```json
   [
     {
       "origin": ["https://yourdomain.com"],
       "method": ["GET", "POST", "PUT", "DELETE"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

2. Redeploy CORS configuration:
   ```bash
   gsutil cors set cors.json gs://YOUR-BUCKET-NAME.firebasestorage.app
   ```

3. Add production environment variables to your hosting platform
4. Ensure service account key is securely stored (not in version control)
