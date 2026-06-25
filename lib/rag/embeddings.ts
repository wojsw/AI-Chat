type FeatureExtractionPipeline = {
  (text: string, options: { pooling: 'mean'; normalize: boolean }): Promise<{
    data: Float32Array | number[];
  }>;
};

type TransformersModule = {
  pipeline: (task: 'feature-extraction', model: string) => Promise<FeatureExtractionPipeline>;
  env?: {
    allowLocalModels?: boolean;
  };
};

const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getTransformersModule(): Promise<TransformersModule> {
  return import('@xenova/transformers') as Promise<TransformersModule>;
}

async function getEmbeddingPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = getTransformersModule().then(({ pipeline }) =>
      pipeline('feature-extraction', EMBEDDING_MODEL),
    );
  }

  return pipelinePromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });

  return Array.from(output.data);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    embeddings.push(await embedText(text));
  }

  return embeddings;
}
