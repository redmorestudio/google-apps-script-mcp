/**
 * OAuth authentication helper for Google Apps Script API
 */

import 'dotenv/config';
import { google } from 'googleapis';
import { createServer } from 'http';
import open from 'open';
import { URL } from 'url';
import { createConnection } from 'net';
import { TokenManager } from './tokenManager.js';
import { logger } from './logger.js';

// Configuration - Comprehensive scopes for all Google APIs
const SCOPES = [
  // Google Apps Script API - Full access
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.projects.readonly',
  'https://www.googleapis.com/auth/script.deployments',
  'https://www.googleapis.com/auth/script.deployments.readonly',
  'https://www.googleapis.com/auth/script.metrics',
  'https://www.googleapis.com/auth/script.processes',
  'https://www.googleapis.com/auth/script.webapp.deploy',
  // Google Sheets API - Required for script execution to access spreadsheets
  'https://www.googleapis.com/auth/spreadsheets'
];

const REDIRECT_URI = 'http://localhost:3001/oauth/callback';
const PORT = 3001;

// Token manager instance
const tokenManager = new TokenManager();

/**
 * Finds an available port starting from the given port
 * @param {number} startPort - Port to start checking from
 * @returns {Promise<number>} Available port number
 */
async function findAvailablePort(startPort = PORT) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', () => {
      findAvailablePort(startPort + 1).then(resolve);
    });
  });
}

/**
 * Creates and configures OAuth2 client
 * @returns {OAuth2Client} Configured OAuth2 client
 */
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_APP_SCRIPT_API_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_APP_SCRIPT_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('AUTH', 'Missing required OAuth credentials', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    });
    throw new Error('Missing required OAuth credentials: GOOGLE_APP_SCRIPT_API_CLIENT_ID and GOOGLE_APP_SCRIPT_API_CLIENT_SECRET must be set in environment variables');
  }

  logger.info('AUTH', 'Creating OAuth2 client', {
    clientId: clientId.substring(0, 20) + '...',
    redirectUri: REDIRECT_URI,
    scopeCount: SCOPES.length,
    scopes: SCOPES
  });

  console.log('🔐 Creating OAuth2 client...');
  console.log('   - Client ID:', clientId);
  console.log('   - Redirect URI:', REDIRECT_URI);
  console.log('   - Scopes:', SCOPES.length, 'permissions');

  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Starts OAuth flow with browser automation
 * @returns {Promise<Object>} OAuth tokens
 */
async function startOAuthFlow() {
  console.log('🚀 Starting OAuth flow...');
  
  const oAuth2Client = createOAuth2Client();
  
  return new Promise(async (resolve, reject) => {
    try {
      // Use the exact port that matches Google Cloud Console configuration
      const callbackPort = PORT; // Must match Google Cloud Console redirect URI
      
      console.log(`🌐 Starting OAuth callback server on port ${callbackPort}`);
      console.log(`🔗 Redirect URI: ${REDIRECT_URI}`);
      
      // Create temporary HTTP server for OAuth callback
      const server = createServer(async (req, res) => {
        console.log('📥 OAuth callback received:', req.url);
        
        try {
          const url = new URL(req.url, `http://localhost:${callbackPort}`);
          
          if (url.pathname === '/oauth/callback') {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            if (error) {
              console.error('❌ OAuth error:', error);
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                    <h2 style="color: #dc3545;">❌ Authentication Failed</h2>
                    <p>Error: ${error}</p>
                    <p>You can close this window.</p>
                  </body>
                </html>
              `);
              server.close();
              reject(new Error(`OAuth error: ${error}`));
              return;
            }
            
            if (!code) {
              console.error('❌ No authorization code received');
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                    <h2 style="color: #dc3545;">❌ No Authorization Code</h2>
                    <p>No authorization code received from Google.</p>
                    <p>You can close this window.</p>
                  </body>
                </html>
              `);
              server.close();
              reject(new Error('No authorization code received'));
              return;
            }
            
            console.log('🔄 Exchanging authorization code for tokens...');
            console.log('🔑 Authorization code:', code.substring(0, 20) + '...');
              try {
              const { tokens: newTokens } = await oAuth2Client.getToken(code);
              
              console.log('✅ Token exchange successful!');
              console.log('🎟️ Token details:');
              console.log('   - Access token:', newTokens.access_token ? '✅ Received' : '❌ Missing');
              console.log('   - Refresh token:', newTokens.refresh_token ? '✅ Received' : '❌ Missing');
              console.log('   - Token type:', newTokens.token_type || 'Not specified');
              console.log('   - Expires in:', newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : 'No expiry');
              console.log('   - Scope:', newTokens.scope || 'Not specified');
              
              // Success response
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                    <h2 style="color: #28a745;">✅ Authentication Successful!</h2>
                    <p>You have been successfully authenticated with Google Apps Script API.</p>
                    <p><strong>Access Token:</strong> ${newTokens.access_token ? 'Received ✅' : 'Missing ❌'}</p>
                    <p><strong>Refresh Token:</strong> ${newTokens.refresh_token ? 'Received ✅' : 'Missing ❌'}</p>
                    <p><strong>You can now close this window and return to your application.</strong></p>
                    <script>
                      setTimeout(() => {
                        window.close();
                      }, 5000);
                    </script>
                  </body>
                </html>
              `);
              
              server.close();
              resolve(newTokens);
              
            } catch (tokenError) {
              console.error('❌ Error exchanging code for tokens:', tokenError);
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                    <h2 style="color: #dc3545;">❌ Token Exchange Failed</h2>
                    <p>Failed to exchange authorization code for tokens.</p>
                    <pre style="text-align: left; background: #f8f9fa; padding: 20px;">${tokenError.message}</pre>
                    <p>You can close this window.</p>
                  </body>
                </html>
                `);
              server.close();
              reject(tokenError);
            }
          } else {
            // Handle other paths
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        } catch (err) {
          console.error('❌ Server error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          server.close();
          reject(err);
        }
      });

      // Start server on the specific port
      server.listen(callbackPort, () => {
        console.log(`🌐 OAuth callback server started on port ${callbackPort}`);
        
        // Generate authorization URL
        const authUrl = oAuth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
          prompt: 'consent'
        });
        
        console.log('🔗 Opening OAuth URL in browser...');
        console.log('📋 OAuth URL:', authUrl);
        
        // Open browser
        open(authUrl).catch(err => {
          console.error('❌ Failed to open browser:', err);
          console.log('🔗 Please manually open this URL in your browser:');
          console.log(authUrl);
        });
      });

      // Handle server errors
      server.on('error', (err) => {
        console.error('❌ Server error:', err);
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${callbackPort} is already in use. Please close other applications using this port or update your Google Cloud Console redirect URI to use a different port.`));
        } else {
          reject(err);
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth flow timed out after 5 minutes'));
      }, 5 * 60 * 1000);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gets an OAuth access token using TokenManager
 * @returns {Promise<string>} Access token
 */
export async function getOAuthAccessToken() {
  logger.info('AUTH', 'Requesting OAuth access token');
  console.log('🔐 Getting OAuth access token...');
  
  const clientId = process.env.GOOGLE_APP_SCRIPT_API_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_APP_SCRIPT_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('AUTH', 'Missing OAuth credentials', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    });
    throw new Error('Missing required OAuth credentials: GOOGLE_APP_SCRIPT_API_CLIENT_ID and GOOGLE_APP_SCRIPT_API_CLIENT_SECRET must be set in environment variables');
  }
  
  try {
    const startTime = Date.now();
    logger.debug('AUTH', 'Getting valid access token from token manager');
    
    const accessToken = await tokenManager.getValidAccessToken(clientId, clientSecret);
    const duration = Date.now() - startTime;
    
    logger.info('AUTH', 'Access token obtained successfully', {
      duration: `${duration}ms`,
      tokenLength: accessToken ? accessToken.length : 0,
      tokenPrefix: accessToken ? accessToken.substring(0, 10) + '...' : null
    });
    
    console.log('✅ Access token obtained successfully');
    return accessToken;
  } catch (error) {
    logger.error('AUTH', 'Failed to obtain access token', {
      error: {
        message: error.message,
        stack: error.stack
      },
      hasStoredTokens: tokenManager.hasStoredTokens()
    });
    
    if (error.message.includes('No tokens found')) {
      console.error('❌ No OAuth tokens found.');
      console.log('💡 Please run the OAuth setup first:');
      console.log('   node oauth-setup.js');
      throw new Error('OAuth tokens not found. Please run: node oauth-setup.js');
    }
    
    console.error('❌ Error getting access token:', error);
    throw error;
  }
}

/**
 * Helper function to get authorization headers for API requests
 * @returns {Promise<Object>} Headers object with Authorization
 */
export async function getAuthHeaders() {
  logger.debug('AUTH', 'Creating authorization headers');
  console.log('📋 Creating authorization headers...');
  
  const accessToken = await getOAuthAccessToken();
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  logger.debug('AUTH', 'Authorization headers created', {
    hasAuthorization: !!headers.Authorization,
    authHeaderLength: headers.Authorization ? headers.Authorization.length : 0,
    contentType: headers['Content-Type'],
    accept: headers.Accept
  });
  
  console.log('✅ Authorization headers created successfully');
  return headers;
}

/**
 * Manually trigger OAuth flow (useful for testing)
 * @returns {Promise<Object>} OAuth tokens
 */
export async function manualOAuthFlow() {
  console.log('🔄 Starting manual OAuth flow...');
  const tokens = await startOAuthFlow();
  
  // Save tokens using TokenManager
  tokenManager.saveTokens(tokens);
  
  return tokens;
}

/**
 * Check if we have valid tokens
 * @returns {boolean} True if tokens are available
 */
export function hasValidTokens() {
  return tokenManager.hasStoredTokens();
}

/**
 * Clear stored tokens (logout)
 */
export function clearTokens() {
  console.log('🚪 Clearing stored tokens...');
  tokenManager.clearTokens();
  console.log('✅ Tokens cleared successfully');
}

/**
 * Get current token information (for debugging)
 * @returns {Object|null} Current token info
 */
export function getTokenInfo() {
  return tokenManager.getTokenInfo();
}
