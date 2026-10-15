const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');

if (fs.existsSync(envFile)) {
  const envLines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of envLines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|:)\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }

    process.env[match[1]] = value;
  }
}

const envNames = {
  apiKey: ['FIREBASE_API_KEY', 'apiKey'],
  authDomain: ['FIREBASE_AUTH_DOMAIN', 'authDomain'],
  projectId: ['FIREBASE_PROJECT_ID', 'projectId'],
  appId: ['FIREBASE_APP_ID', 'appId']
};

const firebaseConfig = {};
const missing = [];

for (const [configKey, candidates] of Object.entries(envNames)) {
  const value = candidates.map(name => process.env[name]).find(Boolean);
  if (!value) {
    missing.push(candidates[0]);
  } else {
    firebaseConfig[configKey] = value;
  }
}

if (missing.length) {
  throw new Error(`Missing Firebase configuration. Set: ${missing.join(', ')}.`);
}

const generatedConfig = `import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
`;

fs.writeFileSync(path.join(root, 'firebase-config.js'), generatedConfig);
