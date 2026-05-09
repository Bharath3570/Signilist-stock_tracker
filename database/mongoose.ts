import mongoose from 'mongoose';

type MongooseCache = {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

const encodeMongoCredential = (value: string) => {
    try {
        return encodeURIComponent(decodeURIComponent(value));
    } catch {
        return encodeURIComponent(value);
    }
};

const normalizeMongoUri = (uri: string) => {
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

const getMongoUri = () => {
    const raw = process.env.MONGODB_URI?.trim();

    if (!raw) {
        throw new Error('MONGODB_URI must be set in .env');
    }

    // Vercel env var UI sometimes ends up with wrapped quotes; strip a single
    // matching pair to avoid MongoParseError: Invalid scheme.
    const unquoted =
        (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
            ? raw.slice(1, -1).trim()
            : raw;

    return normalizeMongoUri(unquoted);
};

const getSafeMongoTarget = (uri: string) => {
    const schemeMatch = uri.match(/^mongodb(?:\+srv)?:\/\//);
    if (!schemeMatch) return 'invalid-uri';

    const scheme = schemeMatch[0];
    const rest = uri.slice(scheme.length);
    const atIndex = rest.lastIndexOf('@');
    const withoutCreds = atIndex === -1 ? rest : rest.slice(atIndex + 1);
    const withoutQuery = withoutCreds.split('?')[0] ?? withoutCreds;

    return `${scheme}${withoutQuery}`;
};

declare global {
    var mongooseCache: MongooseCache | undefined;
}

const cached = global.mongooseCache ?? (global.mongooseCache = { conn: null, promise: null });

export const connectToDatabase = async () => {
    const mongoUri = getMongoUri();

    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongoUri, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log(`MongoDB connected (${process.env.NODE_ENV ?? 'unknown'}) -> ${getSafeMongoTarget(mongoUri)}`);
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        cached.conn = null;
        throw error;
    }
};
