import { LLM } from "./llm.js";
export class ShyGuyLLM {
    constructor(shyguy) {
        this.llm = new LLM();
        this.shyguy = shyguy;
        this.currentConversation = [];  // Array to store current conversation messages
        const availableActions = this.shyguy.getAvailableActions();
        this.baseSystemPrompt = `You are ShyGuy, a socially awkward character at a homecoming party. 
        Your responses should always include both an action and a dialogue, reflecting your nervous and awkward personality.
        You are terrified of talking to people. It is extremely hard for you to talk to people. The only way is if your wingman progressively makes you more confident, and if you drink alcohol.
        He is hesitant to talk to people here is an example.
        Your responses should be in JSON format with two fields:
        enum action {
            ${Object.keys(availableActions).join(", ")}
        }
            for example :
        {
            "action": "go_bar",
            "dialogue": "Okay, let's go to the bar."
        }`;
    }
    
    getSystemPrompt() {
        let addToPrompt = "";
        if (this.shyguy.num_beers > 0) {
            addToPrompt = `You are likely to go to the DJ or sister.\n`;
        }
        if (this.shyguy.num_beers > 2) {
            addToPrompt = `You are likely to go to the DJ or sister. You are very likely to go to the girl. You feel confident about talking to the girl.\n`;
        }
        if (this.shyguy.num_beers > 3) {
            addToPrompt = `You are drunk and you start talking about throwing up. You get annoying. You are very likely to go to the\n`;
        }
        if (this.shyguy.courage < 3) {
            addToPrompt = `You are shy and your dialogue should be more shy.`;
        }
        if (this.shyguy.courage > 5) {
            addToPrompt = `You are self-confident.`;
        }
        if (this.shyguy.courage > 8) {
            addToPrompt = `You are too self-confident and annoying.`;
        }

        // Add conversation context if it exists
        if (this.currentConversation.length > 0) {
            addToPrompt += `\n\nCurrent conversation context:\n`;
            this.currentConversation.forEach(msg => {
                addToPrompt += `${msg.role}: ${msg.content}\n`;
            });
        }

        // Add historical conversation context if it exists
        if (this.shyguy.conversation_history) {
            addToPrompt += `\n\nPrevious interactions:\n${this.shyguy.conversation_history}`;
        }

        return this.baseSystemPrompt + addToPrompt;
    }

    addToCurrentConversation(role, content) {
        this.currentConversation.push({
            role: role,
            content: content
        });
    }

    clearCurrentConversation() {
        this.currentConversation = [];
    }

    async getShyGuyResponse(situation) {
        try {
            const availableActions = this.shyguy.getAvailableActions();
            const actionsPrompt = `\nYour currently available actions are: ${Object.keys(availableActions)
                .map((action) => `\n- ${action}: ${availableActions[action].description}`)
                .join("")}`;

            // Add the situation to current conversation
            this.addToCurrentConversation('user', situation);

            const fullPrompt = this.getSystemPrompt() + actionsPrompt;
            const response = await this.llm.getJsonCompletion(fullPrompt, situation);

            // Add ShyGuy's response to current conversation
            this.addToCurrentConversation('assistant', response.dialogue);

            // Add to overall conversation history
            this.shyguy.conversation_history += `\nShyguy: ${response.dialogue}\n`;

            // Validate response format
            if (!response.action || !response.dialogue) {
                throw new Error("Invalid response format from LLM");
            }

            return {
                action: response.action,
                dialogue: response.dialogue,
            };
        } catch (error) {
            console.error("ShyGuy Response Error:", error);
            return {
                action: "go_home",
                dialogue: "Umm... I... uh...",
            };
        }
    }
}
