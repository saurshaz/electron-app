// token-store.js
const keytar = require('keytar');

async function saveRefreshToken(token) {
  await keytar.setPassword('AmazonSellerApp', 'refresh_token', token);
}

async function getRefreshToken() {
  return await keytar.getPassword('AmazonSellerApp', 'refresh_token');
}