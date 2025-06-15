import { getAuthHeaders } from '../../../lib/oauth-helper.js';
import { logger } from '../../../lib/logger.js';

/**
 * Function to run a Google Apps Script.
 *
 * @param {Object} args - Arguments for the script execution.
 * @param {string} args.scriptId - The ID of the script to run.
 * @param {string} args.functionName - The name of the function to execute.
 * @param {Array} [args.parameters=[]] - Parameters to pass to the function.
 * @param {boolean} [args.devMode=true] - Whether to run in development mode.
 * @param {string} [args.fields] - Selector specifying which fields to include in a partial response.
 * @param {string} [args.alt='json'] - Data format for response.
 * @param {string} [args.key] - API key for the project.
 * @param {string} [args.access_token] - OAuth access token.
 * @param {string} [args.oauth_token] - OAuth 2.0 token for the current user.
 * @param {string} [args.quotaUser] - Available to use for quota purposes for server-side applications.
 * @param {boolean} [args.prettyPrint=true] - Returns response with indentations and line breaks.
 * @returns {Promise<Object>} - The result of the script execution.
 */
const executeFunction = async ({ scriptId, functionName, parameters = [], devMode = true, fields, alt = 'json', key, access_token, oauth_token, quotaUser, prettyPrint = true }) => {
  const baseUrl = 'https://script.googleapis.com';
  const url = new URL(`${baseUrl}/v1/scripts/${scriptId}:run`);
  
  // Append query parameters to the URL
  const params = new URLSearchParams();
  
  // Only add parameters that are actually provided
  if (fields) params.append('fields', fields);
  if (alt) params.append('alt', alt);
  if (prettyPrint !== undefined) params.append('prettyPrint', prettyPrint.toString());
  
  // Don't add authentication parameters - they're handled by headers
  // if (key) params.append('key', key);
  // if (access_token) params.append('access_token', access_token);
  // if (oauth_token) params.append('oauth_token', oauth_token);
  
  if (quotaUser) params.append('quotaUser', quotaUser);
  
  url.search = params.toString();

  // Create request body with function name and parameters
  const requestBody = {
    function: functionName,
    parameters: parameters,
    devMode: devMode
  };

  try {
    // Get OAuth headers
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    
    logger.info('SCRIPT_RUN', `Executing function: ${functionName}`, {
      scriptId,
      functionName,
      parameters,
      devMode
    });
    
    // Perform the fetch request
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    // Parse and return the response data
    const data = await response.json();
    
    logger.info('SCRIPT_RUN', `Function execution completed`, {
      scriptId,
      functionName,
      hasResult: !!data.response?.result,
      hasError: !!data.error,
      done: data.done
    });
    
    // Log any execution logs from the script
    if (data.response?.executionMetadata?.log) {
      logger.info('SCRIPT_RUN', 'Script execution logs:', {
        logs: data.response.executionMetadata.log
      });
    }
    
    return data;
  } catch (error) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      scriptId,
      timestamp: new Date().toISOString(),
      errorType: error.name || 'Unknown'
    };

    logger.error('SCRIPT_RUN', 'Error running the script', errorDetails);
    
    console.error('❌ Error running the script:', errorDetails);
    
    // Return detailed error information for debugging
    return { 
      error: true,
      message: error.message,
      details: errorDetails,
      rawError: {
        name: error.name,
        stack: error.stack
      }
    };
  }
};

/**
 * Tool configuration for running Google Apps Script.
 * @type {Object}
 */
const apiTool = {
  function: executeFunction,
  definition: {
    type: 'function',
    function: {
      name: 'script_run',
      description: 'Run a Google Apps Script.',
      parameters: {
        type: 'object',
        properties: {
          scriptId: {
            type: 'string',
            description: 'The ID of the script to run.'
          },
          functionName: {
            type: 'string',
            description: 'The name of the function to execute in the Apps Script.'
          },
          parameters: {
            type: 'array',
            description: 'Parameters to pass to the function.',
            default: []
          },
          devMode: {
            type: 'boolean',
            description: 'Whether to run in development mode (uses latest saved version).',
            default: true
          },
          fields: {
            type: 'string',
            description: 'Selector specifying which fields to include in a partial response.'
          },
          alt: {
            type: 'string',
            enum: ['json', 'xml'],
            description: 'Data format for response.'
          },
          key: {
            type: 'string',
            description: 'API key for the project.'
          },
          access_token: {
            type: 'string',
            description: 'OAuth access token.'
          },
          oauth_token: {
            type: 'string',
            description: 'OAuth 2.0 token for the current user.'
          },
          quotaUser: {
            type: 'string',
            description: 'Available to use for quota purposes for server-side applications.'
          },
          prettyPrint: {
            type: 'boolean',
            description: 'Returns response with indentations and line breaks.'
          }
        },
        required: ['scriptId', 'functionName']
      }
    }
  }
};

export { apiTool };