import{ ConversationLLM } from "./conversation_llm.js";
import { Game } from "./game.js";

// Add test function
async function testConversation() {
  const character1Prompt = "You are a friendly wizard who loves teaching magic";
  const character2Prompt = "You are an eager student excited to learn magic";
  const formatPrompt = "Respond naturally in a conversational way. Keep responses brief (1-2 sentences).";
  const functionDescriptions = [{
    key: "analyzeMagicSpells",
    description: "Analyze the conversation to determine how many magic spells were mentioned",
    parameters: {
      totalSpells: {
        type: "number",
        description: "Total number of spells mentioned in the conversation"
      }
    }
  }];
  const functionPrompt = "Analyze this conversation and count how many different magic spells were mentioned: ";

  const convo = new ConversationLLM(
    "Wizard", // character1Name
    "Student", // character2Name
    character1Prompt,
    character2Prompt,
    formatPrompt,
    functionDescriptions,
    functionPrompt
  );
  
  try {
    const conversation = await convo.generateConversation(3);
    console.log("Generated conversation:", conversation);
  } catch (error) {
    console.error("Conversation test failed:", error);
  }
}

// start the game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("[index]: DOMContentLoaded");
  
  // Run the conversation test
  testConversation();

  const game = new Game();
  game.run();
});
