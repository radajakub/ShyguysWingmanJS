import { GameEngine } from "./game_engine.js";
import { ShyguyLLM } from "./shyguy_llm.js";
import { SisterLLM } from "./sister_llm.js";
import { StoryEngine } from "./story_engine.js";

export class Game {
  constructor() {
    this.gameEngine = new GameEngine();
    this.shyguyLLM = new ShyguyLLM();
    this.sisterLLM = new SisterLLM();
    this.storyEngine = new StoryEngine();
  }

  run() {
    console.log("[Game]: run");
    this.gameEngine.init();
    // initialize and start other classes
  }
}
