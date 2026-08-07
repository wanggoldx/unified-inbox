# OAuth Setup Guide

This guide walks you through setting up OAuth 2.0 credentials for Google (Gmail) and Microsoft (Outlook).

---

## Prerequisites

| Provider | Account Needed |
|----------|---------------|
| Google | Google account + [Google Cloud Console](https://console.cloud.google.com) access |
| Microsoft | Microsoft account + [Azure Portal](https://portal.azure.com) access |

---

## Google (Gmail) OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown (top bar) → **New Project**
3. Name: `unified-inbox` (or any name you prefer)
4. Click **Create**

### Step 2: Enable Gmail API

1. In the sidebar, go to **APIs & Services** → **Library**
2. Search for `Gmail API`
3. Click on it → Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace organization)
3. Click **Create**
4. Fill in:
   - **App name**: `Unified Inbox`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. On **Scopes** page: Click **Add or Remove Scopes**
7. Search and add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
8. Click **Save and Continue**
9. On **Test users** page: Add your own email address
   - **Note**: While the app is in "Testing" status, only added test users can authorize
10. Click **Save and Continue**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Fill in:
   - **Application type**: `Web application`
   - **Name**: `Unified Inbox Backend`
4. Under **Authorized redirect URIs**, click **Add URI**:
   ```
   http://localhost:3001/api/accounts/gmail/callback
   ```
5. Click **Create**
6. **Copy the Client ID and Client Secret**

### Step 5: Configure Environment Variables

Add to your `backend/.env`:

```env
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3001/api/accounts/gmail/callback
```

---

## Microsoft (Outlook) OAuth Setup

### Step 1: Register an App in Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **App registrations** in the top search bar
3. Click **+ New registration**
4. Fill in:
   - **Name**: `Unified Inbox`
   - **Supported account types**: `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI**: Select **Web** → Enter:
     ```
     http://localhost:3001/api/accounts/outlook/callback
     ```
5. Click **Register**
6. **Copy the Application (client) ID** → this is your `OUTLOOK_CLIENT_ID`

### Step 2: Create a Client Secret

1. In the sidebar, click **Certificates & secrets**
2. Click **+ New client secret**
3. Fill in:
   - **Description**: `Unified Inbox Secret`
   - **Expires**: Choose as needed (e.g., 24 months)
4. Click **Add**
5. **IMMEDIATELY copy the Secret Value** (it won't show again!)
   - This is your `OUTLOOK_CLIENT_SECRET`

### Step 3: Add API Permissions

1. In the sidebar, click **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph** → **Delegated permissions**
4. Search and add these permissions:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `offline_access`
5. Click **Add permissions**
6. (Optional) Click **Grant admin consent for [your organization]** if available

### Step 4: Configure Environment Variables

Add to your `backend/.env`:

```env
OUTLOOK_CLIENT_ID=your_application_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret_value
OUTLOOK_REDIRECT_URI=http://localhost:3001/api/accounts/outlook/callback
```

---

## Encryption Key Setup

For storing OAuth tokens securely, you need a 32-byte hex key.

### Generate a Key

Run this in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This outputs a 64-character hex string (32 bytes).

### Add to Environment

```env
ENCRYPTION_KEY=your_64_character_hex_key_here
```

---

## Common Issues

### "redirect_uri_mismatch" Error

- The redirect URI in your code **must exactly match** the one in Google Cloud Console / Azure Portal
- Check for trailing slashes, `http` vs `https`, port numbers

### "Access Denied" / "Consent Denied"

- Ensure you added your email as a test user (Google)
- Ensure the app is in "Testing" mode or published (Google)

### "Invalid Client Secret"

- Regenerate the client secret in the console
- Update your `.env` file immediately

### Token Expired

- The app automatically refreshes tokens using the refresh_token
- If refresh fails, the user needs to re-authorize

---

## Security Notes

1. **Never commit `.env` files** to version control
2. **Never commit Client Secrets** to any repository
3. **Regenerate secrets** if they are accidentally exposed
4. **Use HTTPS** in production (redirect URIs must be `https`)
5. **Store tokens encrypted** — the app uses AES-256-GCM encryption

---

## Production Considerations

| Setting | Development | Production |
|---------|-------------|------------|
| Redirect URI | `http://localhost:3001/...` | `https://yourdomain.com/...` |
| App Status | Testing | Published |
| User Access | Test users only | All users |
| Token Storage | SQLite | PostgreSQL |

For production, update the redirect URIs in both your app and the OAuth provider consoles.
