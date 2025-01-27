import { LLM } from "./llm.js";
export class ShyGuyLLM {
  constructor(shyguy) {
    this.llm = new LLM();
    this.shyguy = shyguy;
    this.currentConversation = [];  // Array to store current conversation messages
    const availableActions = this.shyguy.getAvailableActions();
    this.baseSystemPrompt = `You are ShyGuy, a socially awkward character at a homecoming party. You are shy.
        The wingman progressively makes you more confident, and if you drink alcohol, you also get more confident.
        You know the wingman, he is your friend. You are talking to him.
        You are willing to have a little alcohol.
        If there is no clear action, you go home. Do not stay idle twice in a row.
        The action should correspond to the dialogue.
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
        // Add historical conversation context if it exists
        if (this.shyguy.conversation_history) {
            addToPrompt += `\n\nPrevious interactions:\n${this.shyguy.conversation_history}`;
        }
        if (this.shyguy.num_beers > 0) {
            addToPrompt += `You are likely to go to the DJ or sister.\n`;
        }
        if (this.shyguy.num_beers > 2) {
            addToPrompt += `You are likely to go to the DJ or sister. You are very likely to go to the girl. You feel confident about talking to the girl.\n`;
        }
        if (this.shyguy.num_beers > 3) {
            addToPrompt += `You are drunk and you start talking about how bad you feel. You are annoying. You talk about algorithms and then how bad you feel.\n`;
        }
        if (this.shyguy.courage < 2) {
            addToPrompt += `You are shy. However, you believe wingman. You are willing to go the DJ, you are just shy.`;
        }
        if (this.shyguy.courage >= 2) {
            addToPrompt += `You talk normally.`;
        }
        if (this.shyguy.courage > 5) {
            addToPrompt += `You are self-confident.`;
        }
        if (this.shyguy.courage > 8) {
            addToPrompt += `You are too self-confident and annoying.`;
        }
        addToPrompt += `\nYou drank ${this.shyguy.num_beers} beers. Your courage is ${this.shyguy.courage}.`;
        if (this.currentConversation.length > 0) {
            addToPrompt += `\n\nCurrent conversation context:\n`;
            this.currentConversation.forEach(msg => {
                addToPrompt += `${msg.role}: ${msg.content}\n`;
            });
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

    async getShyGuyResponse(player_message) {
        try {
            const availableActions = this.shyguy.getAvailableActions();
            const actionsPrompt = `\nYour currently available actions are: ${Object.keys(availableActions)
                .map((action) => `\n- ${action}: ${availableActions[action].description}`)
                .join("")}`;
            // Add the situation to current conversation
            this.addToCurrentConversation('wingman', player_message);

            // Add the conversation to shyguy's history
            this.shyguy.conversation_history += `\nWingman: ${player_message}\n`;

            const fullPrompt = this.getSystemPrompt() + actionsPrompt;
            console.log("[ShyGuy]: Full prompt: ", fullPrompt);
            const response = await this.llm.getJsonCompletion(fullPrompt, player_message);
            console.log("[ShyGuy]: Response: ", response);

            // Add ShyGuy's response to current conversation
            this.addToCurrentConversation('shyguy', response.dialogue);

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
