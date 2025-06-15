#!/usr/bin/env node

import { getAuthHeaders } from './lib/oauth-helper.js';

async function testOAuth() {
  console.log('Testing OAuth authentication...\n');
  
  try {
    // Get auth headers
    const headers = await getAuthHeaders();
    console.log('✅ Successfully got auth headers');
    console.log(`   Authorization: Bearer ${headers.Authorization.substring(0, 50)}...`);
    
    // Test API call - list scripts
    console.log('\nTesting API call - fetching script info...');
    const scriptId = '1i4qaE4iLJRAjcoirYxKjOmHf27U-kXjHBZBEJw_LxFgaJiwWf1REvSxH';
    
    const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}`, {
      headers: headers
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ OAuth is working! Script info:');
      console.log(`   Title: ${data.title}`);
      console.log(`   Script ID: ${data.scriptId}`);
      console.log(`   Last modified: ${data.updateTime}`);
    } else {
      const error = await response.text();
      console.log('\n❌ API call failed:', error);
    }
    
  } catch (error) {
    console.error('❌ OAuth test failed:', error.message);
  }
}

testOAuth();
