import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const envFile = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const getSafeMongoTarget = (uri) => {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return 'invalid-uri';
  }
};

const encodeMongoCredential = (value) => {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
};

const normalizeMongoUri = (uri) => {
  const schemeMatch = uri.match(/^mongodb(?:\+srv)?:\/\//);

  if (!schemeMatch) {
    return uri;
  }

  const scheme = schemeMatch[0];
  const rest = uri.slice(scheme.length);
  const atIndex = rest.lastIndexOf('@');

  if (atIndex === -1) {
    return uri;
  }

  const credentials = rest.slice(0, atIndex);
  const hostAndPath = rest.slice(atIndex + 1);
  const separatorIndex = credentials.indexOf(':');

  if (separatorIndex === -1) {
    return `${scheme}${encodeMongoCredential(credentials)}@${hostAndPath}`;
  }

  const username = credentials.slice(0, separatorIndex);
  const password = credentials.slice(separatorIndex + 1);

  return `${scheme}${encodeMongoCredential(username)}:${encodeMongoCredential(password)}@${hostAndPath}`;
};

loadEnvFile(envPath);

const mongoUri = process.env.MONGODB_URI?.trim()
  ? normalizeMongoUri(process.env.MONGODB_URI.trim())
  : '';

if (!mongoUri) {
  console.error('MONGODB_URI is missing in .env');
  process.exit(1);
}

try {
  console.log(`Checking MongoDB connection -> ${getSafeMongoTarget(mongoUri)}`);

  await mongoose.connect(mongoUri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('Connected, but no database handle was created.');
  }

  await db.admin().ping();

  console.log(`MongoDB ping succeeded. Database: ${db.databaseName}`);
  process.exit(0);
} catch (error) {
  console.error('MongoDB check failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
