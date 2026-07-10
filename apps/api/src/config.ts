import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible .env locations
const possiblePaths = [
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), 'apps/api/.env'),
  path.join(process.cwd(), '.env'),
];

let loaded = false;
for (const envPath of possiblePaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`Loaded .env from: ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.error('Failed to load .env from any location');
  console.log('Attempted paths:', possiblePaths);
}
