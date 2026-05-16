import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "";
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "luccca-recipes";

let pineconeClient: Pinecone | null = null;

export const getPineconeClient = () => {
  if (!PINECONE_API_KEY) {
    throw new Error(
      "Pinecone is not configured. Check PINECONE_API_KEY environment variable.",
    );
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
  }

  return pineconeClient;
};

export const getRecipeIndex = () => {
  const client = getPineconeClient();
  return client.index(PINECONE_INDEX_NAME);
};
