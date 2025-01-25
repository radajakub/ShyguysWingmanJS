import{ ConversationLLM } from "./conversation_llm.js";
import { Game } from "./game.js";

// Add test function
async function testConversation() {
  const character1 = "You are a friendly wizard who loves teaching magic";
  const character2 = "You are an eager student excited to learn magic";
  const formatPrompt = "Respond naturally in a conversational way. Keep responses brief (1-2 sentences).";

  const convo = new ConversationLLM(character1, character2, formatPrompt);
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
