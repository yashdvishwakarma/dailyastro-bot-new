import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * BotEngine: The Core Middleware
 * 
 * Responsibilities:
 * 1. Initialize the correct Model (GPT-4, Claude, etc) based on config.
 * 2. Construct the Prompt (System + Context + User).
 * 3. Execute the Chain.
 * 4. Format the Output based on the requested 'response_mode'.
 */
class BotEngine {
    constructor(config = {}) {
        this.config = config;
        this.modelName = config.model || "gpt-4o-mini";
        this.temperature = config.temperature || 0.7;

        this.apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;

        if (!this.apiKey) {
            console.error("❌ CRITICAL: No API Key found in process.env!");
        }

        // Initialize Language Model
        // Fix: LangChain sometimes fails to map 'openAIApiKey' to the underlying client.
        // We force Set the standard ENV var to ensure the lower-level OpenAI client finds it.
        if (!process.env.OPENAI_KEY && this.apiKey) {
            process.env.OPENAI_KEY = this.apiKey;
        }

        this.llm = new ChatOpenAI({
            modelName: this.modelName,
            temperature: this.temperature,
            apiKey: this.apiKey, // explicit pass
            configuration: { apiKey: this.apiKey } // deeper explicit pass for some versions
        });
    }

    /**
     * Main entry point to generate a response.
     * @param {string} userMessage - The raw user input.
     * @param {object} context - Additional context (RAG docs, History).
     */
    async generateResponse(userMessage, context = {}) {
        try {
            // 1. Build Messages
            const messages = this.buildPrompt(userMessage, context);

            // 2. Determine Output Format
            const responseMode = this.config.response_mode || "text_only";
            let parser;

            if (responseMode === "structured" || responseMode === "empathic") {
                // Enforce JSON mode for structured responses
                this.llm.modelKwargs = { response_format: { type: "json_object" } };
                parser = new JsonOutputParser();
            } else {
                // Default text mode
                this.llm.modelKwargs = {};
                parser = new StringOutputParser();
            }

            // 3. Execute Chain
            // In LangChain v0.2+: await llm.pipe(parser).invoke(messages)
            const chain = this.llm.pipe(parser);
            const response = await chain.invoke(messages);

            return response;

        } catch (error) {
            console.error("BotEngine Execution Error:", error);
            // Fallback for reliability
            return "I'm experiencing a brief disruption. Please try again.";
        }
    }

    /**
     * Constructs the message array for the LLM.
     */
    buildPrompt(userMessage, context) {
        const messages = [];

        // A. System Prompt (The Personality)
        let systemText = this.config.system_prompt || "You are a helpful assistant.";

        // Append Output Instructions based on Mode
        if (this.config.response_mode === "structured") {
            systemText += `\n\nOUTPUT INSTRUCTIONS:\nReturn valid JSON only. Schema: { "text": "string", "intent": "string", "confidence": number }`;
        } else if (this.config.response_mode === "empathic") {
            systemText += `\n\nOUTPUT INSTRUCTIONS:\nReturn valid JSON only. Schema: { "text": "string", "severity": 0-10, "emotion": "string", "need": "string" }`;
        }

        // B. RAG Context (Injected Knowledge)
        if (context.rag_content) {
            systemText += `\n\n[RELEVANT KNOWLEDGE]\n${context.rag_content}\n`;
            systemText += `\n[INSTRUCTION]\nAnswer the user's question using the Provided Knowledge above. If the topic is covered in the context, explain it as best as you can. Do not make up facts, but you don't need to be overly robotic about refusals. Only refuse if the topic is clearly unrelated (e.g. asking about movies/politics).`;
        } else if (this.config.knowledge_base_id) {
            // If this is a RAG-enabled bot but no content was found for the query:
            systemText += `\n[STRICT INSTRUCTION]\nYou are a specialized assistant bound to a specific knowledge base. The user's query did not match any information in your knowledge base. Therefore, you must politely decline to answer and explain that you can only discuss topics related to your specific domain content.`;
        }

        messages.push(new SystemMessage(systemText));

        // C. Conversation History (Short Term Memory)
        if (context.recentMessages && Array.isArray(context.recentMessages)) {
            context.recentMessages.forEach(msg => {
                if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
                else messages.push(new AIMessage(msg.content));
            });
        }

        // D. Current User Message
        messages.push(new HumanMessage(userMessage));

        return messages;
    }
}

export default BotEngine;
