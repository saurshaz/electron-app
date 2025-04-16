// Modules to control application life and create native browser windows
const { app, BrowserWindow, ipcMain, keytar } = require('electron');
const path = require('path');
const express = require('express');
const axios = require('axios');

// Amazon API Configuration
const CLIENT_ID = 'your-client-id'; // Replace with your Amazon Client ID
const CLIENT_SECRET = 'your-client-secret'; // Replace with your Amazon Client Secret
const SCOPES = 'sellingpartnerapi::orders';

// Express Server for OAuth Callback
const expressApp = express();
const PORT = 3000;

expressApp.get('/callback', (req, res) => {
  const code = req.query.code;
  global.authCode = code;
  res.send('<script>window.close()</script>');
});

expressApp.listen(PORT, () => {
  console.log('OAuth server listening on port 3000');
});

// Electron Window Setup
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

// Electron App Initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// OAuth Functions
async function authorize() {
  const authUrl = `https://sellercentral.amazon.com/apps/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&response_type=code`;
  const authWindow = new BrowserWindow({ width: 800, height: 600 });
  authWindow.loadURL(authUrl);
}

async function exchangeCodeForTokens(code) {
  try {
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: `http://localhost:${PORT}/callback`
    });

    const { access_token, refresh_token } = response.data;
    await keytar.setPassword('AmazonSellerApp', 'refresh_token', refresh_token);
    return access_token;
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw error;
  }
}

async function refreshAccessToken() {
  const refreshToken = await keytar.getPassword('AmazonSellerApp', 'refresh_token');
  if (!refreshToken) throw new Error('No refresh token found');

  try {
    const response = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}

// API Functions
async function getOrders(accessToken) {
  try {
    const response = await axios.get('https://sellingpartnerapi-na.amazon.com/orders/v0/orders', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// IPC Communication
ipcMain.handle('get-orders', async () => {
  try {
    const refreshToken = await keytar.getPassword('AmazonSellerApp', 'refresh_token');
    if (!refreshToken) throw new Error('No refresh token found');

    const accessToken = await refreshAccessToken();
    return await getOrders(accessToken);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
});

ipcMain.on('authorize', async () => {
  await authorize();
  const code = await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (global.authCode) {
        clearInterval(interval);
        resolve(global.authCode);
      }
    }, 500);
  });

  try {
    const accessToken = await exchangeCodeForTokens(code);
    console.log('Authorization successful!');
  } catch (error) {
    console.error('Authorization failed:', error);
  }
});