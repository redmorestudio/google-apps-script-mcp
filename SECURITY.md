# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in google-apps-script-mcp, please:

1. **DO NOT** open a public issue
2. Email the details to [your-security-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Best Practices

When using google-apps-script-mcp:

1. **OAuth Configuration**
   - Never commit your `.env` file
   - Use environment variables for CLIENT_ID and CLIENT_SECRET
   - Keep your OAuth credentials secure in Google Cloud Console
   
2. **Token Storage**
   - Refresh tokens are stored securely in OS keychain
   - Never share or commit refresh tokens
   - Rotate credentials if compromised

3. **Keep dependencies updated**
   - Regularly run `npm audit`
   - Update packages when security patches are available

4. **API Permissions**
   - Only grant necessary scopes
   - Review permissions regularly in Google Account settings
   - Revoke access for unused applications

## OAuth Security

This server implements OAuth 2.0 with:
- Secure token storage in OS keychain
- Automatic token refresh
- No credentials stored in code
- Clear separation of configuration and secrets

## Acknowledgments

Based on work by [mohalmah](https://github.com/mohalmah/google-apps-script-mcp-server)
