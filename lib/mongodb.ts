import { MongoClient } from "mongodb";

type GlobalWithMongo = typeof globalThis & {
  trackVitalsMongoClientPromise?: Promise<MongoClient>;
};

export async function getMongoDatabase() {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB_NAME ?? "trackvitals";

  if (!uri) {
    throw new Error("Falta MONGODB_URI en el entorno.");
  }

  const globalWithMongo = globalThis as GlobalWithMongo;

  if (!globalWithMongo.trackVitalsMongoClientPromise) {
    globalWithMongo.trackVitalsMongoClientPromise = new MongoClient(encodeMongoUriCredentials(uri)).connect();
  }

  const client = await globalWithMongo.trackVitalsMongoClientPromise;
  return client.db(databaseName);
}

export function encodeMongoUriCredentials(uri: string) {
  const schemeMatch = uri.match(/^mongodb(?:\+srv)?:\/\//);

  if (!schemeMatch) {
    return uri;
  }

  const scheme = schemeMatch[0];
  const withoutScheme = uri.slice(scheme.length);
  const credentialsEnd = withoutScheme.lastIndexOf("@");

  if (credentialsEnd === -1) {
    return uri;
  }

  const authorityEnd = findAuthorityEnd(withoutScheme, credentialsEnd + 1);
  const authority = withoutScheme.slice(0, authorityEnd);
  const rest = withoutScheme.slice(authorityEnd);
  const credentialsInAuthority = authority.lastIndexOf("@");
  const credentials = authority.slice(0, credentialsInAuthority);
  const host = authority.slice(credentialsInAuthority + 1);

  const passwordStart = credentials.indexOf(":");

  if (passwordStart === -1) {
    return `${scheme}${encodeCredential(credentials)}@${host}${rest}`;
  }

  const username = credentials.slice(0, passwordStart);
  const password = credentials.slice(passwordStart + 1);

  return `${scheme}${encodeCredential(username)}:${encodeCredential(password)}@${host}${rest}`;
}

function findAuthorityEnd(value: string, searchFrom: number) {
  const endCandidates = ["/", "?", "#"]
    .map((separator) => value.indexOf(separator, searchFrom))
    .filter((index) => index !== -1);

  return endCandidates.length ? Math.min(...endCandidates) : value.length;
}

function encodeCredential(value: string) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}
