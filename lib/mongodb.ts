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
    globalWithMongo.trackVitalsMongoClientPromise = new MongoClient(uri).connect();
  }

  const client = await globalWithMongo.trackVitalsMongoClientPromise;
  return client.db(databaseName);
}
