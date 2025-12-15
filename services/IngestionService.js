import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from '@supabase/supabase-js';

// Setup SimpleTextLoader to bypass import issues
class SimpleTextLoader {
    constructor(filePath) {
        this.filePath = filePath;
    }
    async load() {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return [{ pageContent: content, metadata: { source: this.filePath } }];
    }
}

/**
 * IngestionService
 * Handles the "Learning" part of the middleware.
 * Takes raw documents -> Embeddings -> Database.
 */
class IngestionService {
    constructor() {
        // Database connection
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_KEY;
        if (!sbUrl || !sbKey) throw new Error("Missing SUPABASE credentials");

        this.supabase = createClient(sbUrl, sbKey);

        // Embeddings Model
        this.embeddingsInfo = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_KEY,
            modelName: "text-embedding-3-small"
        });
    }

    /**
     * Process a document and store its knowledge.
     * @param {string} filePath - Absolute path to the file.
     * @param {string} knowledgeBaseId - ID to group this knowledge (e.g. 'sales_bot_v1').
     */
    async ingestDocument(filePath, knowledgeBaseId) {
        console.log(`\n🚀 Starting Ingestion: ${path.basename(filePath)} -> [${knowledgeBaseId}]`);

        // 1. Load Document
        const docs = await this.loadDocs(filePath);
        console.log(`   - Loaded ${docs.length} raw semantic pages/blocks.`);

        // 2. Split Text (Chunking)
        // We use Recursive split to keep context together (paragraphs > sentences > words)
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200, // Small overlap looks back at previous context
        });
        const chunks = await splitter.splitDocuments(docs);
        console.log(`   - Split into ${chunks.length} optimized chunks.`);

        // 3. Vectorize & Save (Batch Process)
        let savedCount = 0;
        for (const chunk of chunks) {
            await this.saveChunk(chunk, knowledgeBaseId, filePath);
            savedCount++;
            process.stdout.write(`\r   - Processing: ${savedCount}/${chunks.length}`);
        }

        console.log(`\n✅ Ingestion Complete. Knowledge '${knowledgeBaseId}' updated.`);
    }

    /** Helper: Load based on extension */
    async loadDocs(filePath) {
        const ext = path.extname(filePath).toLowerCase();

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        let loader;
        if (ext === '.pdf') {
            loader = new PDFLoader(filePath, { splitPages: false });
        } else {
            // Default to text (txt, md, json, csv, etc)
            loader = new SimpleTextLoader(filePath);
        }

        return await loader.load();
    }

    /** Helper: Generate embedding & Insert to DB */
    async saveChunk(chunk, kbId, sourceFile) {
        const text = chunk.pageContent;
        // Generate Vector
        const vector = await this.embeddingsInfo.embedQuery(text);

        // Metadata (Source tracking)
        const metadata = {
            source: path.basename(sourceFile),
            loc: chunk.metadata.loc
        };

        // Insert to Supabase
        // Note: reusing 'conversation_embeddings' table
        const { error } = await this.supabase
            .from('conversation_embeddings')
            .insert({
                chat_id: kbId, // Using chat_id column as Knowledge Base ID
                content_type: 'document_chunk',
                summary_id: null, // No summary needed for raw context
                summary_text: text, // SAVE THE ACTUAL TEXT CONTENT!
                embedding: vector,
                metadata: metadata, // Ensure your schema allows extra JSON
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error("   ❌ Save Error:", error.message);
        }
    }
}

export default IngestionService;
