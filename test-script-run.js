#!/usr/bin/env node

import { getAuthHeaders } from './lib/oauth-helper.js';

async function testScriptRun() {
  console.log('Testing script.run functionality...\n');
  
  try {
    // Get auth headers
    const headers = await getAuthHeaders();
    console.log('✅ Got auth headers');
    
    // Test script.run
    const scriptId = '1i4qaE4iLJRAjcoirYxKjOmHf27U-kXjHBZBEJw_LxFgaJiwWf1REvSxH';
    const url = `https://script.googleapis.com/v1/scripts/${scriptId}:run`;
    
    const body = {
      function: 'testFunction',  // Simple test function
      parameters: [],
      devMode: false
    };
    
    console.log('\nCalling script.run API...');
    console.log(`URL: ${url}`);
    console.log(`Body:`, body);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    console.log(`\nResponse status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && !data.error) {
      console.log('\n✅ script.run is working!');
    } else {
      console.log('\n❌ script.run failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testScriptRun();
