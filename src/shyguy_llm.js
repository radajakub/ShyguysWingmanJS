import { LLM } from './llm.js';
export class ShyGuyLLM {
    constructor(shyguy) {
        this.llm = new LLM();
        this.shyguy = shyguy;
        this.baseSystemPrompt = `You are ShyGuy, a socially awkward character at a homecoming party. 
    Your responses should always include both an action and a dialogue, reflecting your nervous and awkward personality.
    Your responses should be in JSON format with two fields:
    - action: A physical action or gesture you're making (keep it brief and awkward)
    - dialogue: What you say out loud (should be hesitant, nervous, or awkward)`;
    }

    async getShyGuyResponse(situation) {
        try {
            const availableActions = this.shyguy.getAvailableActions();
            const actionsPrompt = `\nYour currently available actions are: ${Object.keys(availableActions)
                .map(action => `\n- ${action}: ${availableActions[action].description}`)
                .join('')}`;
            
            const fullPrompt = this.baseSystemPrompt + actionsPrompt;

            const response = await this.llm.getJsonCompletion(
                fullPrompt,
                situation
            );

            // Validate response format
            if (!response.action || !response.dialogue) {
                throw new Error('Invalid response format from LLM');
            }

            return {
                action: response.action,
                dialogue: response.dialogue
            };
        } catch (error) {
            console.error('ShyGuy Response Error:', error);
            // Return a fallback response in case of error
            return {
                action: "nervously shuffles feet",
                dialogue: "Umm... I... uh... *nervous laugh*"
            };
        }
    }
}

