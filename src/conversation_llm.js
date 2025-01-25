import LLM from "./llm";

export class ConversationLLM {
    constructor(character1Prompt, character2Prompt, outputFormatPrompt) {
        this.character1Prompt = character1Prompt;
        this.character2Prompt = character2Prompt;

        this.outputFormatPrompt = outputFormatPrompt;
    }

    async generateConversation(numTurns = 3) {
        try {
            let conversation = [];
            const llm = new LLM();
            
            for (let i = 0; i < numTurns; i++) {
                // Add 1 second delay between turns
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // Alternate between characters for each turn
                const isCharacter1Turn = i % 2 === 0;
                const currentSpeaker = isCharacter1Turn ? this.character1Prompt : this.character2Prompt;
                const currentListener = isCharacter1Turn ? this.character2Prompt : this.character1Prompt;
                
                // Format the conversation history as a proper chat message array
                const conversationHistory = [...conversation]
                    .map(msg => typeof msg === 'string' ? { role: 'assistant', content: msg } : msg);
                
                // Create system message for current speaker
                const systemMessage = {
                    role: 'system',
                    content: `You are: ${currentSpeaker}\nYou are talking to: ${currentListener}\n${this.outputFormatPrompt}`
                };

                // Get response from LLM with proper message format
                const response = await llm.getChatCompletion(
                    systemMessage.content,
                    conversationHistory.length > 0 
                        ? JSON.stringify(conversationHistory)
                        : "Start the conversation"
                );
                
                // Ensure the response is in the correct format
                const parsedResponse = {
                    role: 'assistant',
                    content: this.parseConversation(response)
                };
                
                conversation.push(parsedResponse);
            }
            
            // Add new conversation to past conversation history
            
            return conversation;
        } catch (error) {
            console.error('Error generating conversation:', error);
            throw error;
        }
    }
    parseConversation(llmResponse) {
        // Implement parsing logic based on your output format
        // This should return an array of conversation turns
        return llmResponse;
    }
}
