import { ConversationLLM } from "./conversation_llm.js";
import { Game } from "./game.js";
import ElevenLabsClient from "./eleven_labs.js";



// start the game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game();
  game.run();
});
