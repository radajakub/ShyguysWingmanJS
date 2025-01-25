import LLM from "./llm";

export class ConversationLLM {
    constructor(character1Name, character2Name, character1Prompt, character2Prompt, situation_prompt, outputFormatPrompt, functionDescriptions, functionPrompt) {
        this.character1Name = character1Name;
        this.character2Name = character2Name;
        this.character1Prompt = character1Prompt;
        this.character2Prompt = character2Prompt;
        this.situation_prompt = situation_prompt;
        this.outputFormatPrompt = outputFormatPrompt;
        this.functionDescriptions = functionDescriptions;
        this.functionPrompt = functionPrompt;

    }

    async generateConversation(numTurns = 3) {
        try {
            let conversation = [];
            const llm = new LLM();
            
            for (let i = 0; i < numTurns; i++) {
                
                // Alternate between characters for each turn
                const isCharacter1Turn = i % 2 === 0;
                const currentSpeaker = isCharacter1Turn ? this.character1Prompt : this.character2Prompt;
                const currentListener = isCharacter1Turn ? this.character2Prompt : this.character1Prompt;
                const currentSpeakerName = isCharacter1Turn ? this.character1Name : this.character2Name;
                const currentListenerName = isCharacter1Turn ? this.character2Name : this.character1Name;
                
                // Format the conversation history as a proper chat message array
                const conversationHistory = [...conversation];
                
                // Create system message for current speaker
                const systemMessage = {
                    role: 'system',
                    content: `${this.situation_prompt}\nRoleplay as: ${currentSpeakerName}\nMake only the response to the user. Only speech, no speech style. You have the following personality: ${currentSpeaker}. You talk to ${currentListenerName}.`
                };

                // Get response from LLM with proper message format
                const response = await llm.getChatCompletion(
                    systemMessage.content,
                    conversationHistory.length > 0 
                        ? JSON.stringify(conversationHistory)
                        : "Start the conversation"
                );
                
                // Ensure the response is in the correct format with the proper character role
                const parsedResponse = {
                    role: currentSpeakerName,  // Use the character name instead of prompt
                    content: this.parseConversation(response)
                };
                
                conversation.push(parsedResponse);
            }
            
            // After the conversation is complete, analyze for beer consumption
            // const functionDescriptions = [{
            //     key: "analyzeBeerConsumption",
            //     description: "Analyze the conversation to determine how many beers were consumed",
            //     parameters: {
            //         totalBeers: {
            //             type: "number",
            //             description: "Total number of beers mentioned as being consumed in the conversation"
            //         },
            //     }
            // }];
            //`Analyze this conversation and determine how many beers were consumed: ${JSON.stringify(conversation)}`


            const analysis = await llm.getFunctionKey(
                this.functionDescriptions,
                this.functionPrompt + JSON.stringify(conversation)
            );

            return {
                conversation,
                analysis
            };
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


