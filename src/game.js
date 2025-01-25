import { GameEngine } from "./game_engine.js";
import { ShyGuyLLM } from "./shyguy_llm.js";
import { StoryEngine } from "./story_engine.js";

export class Game {
  constructor() {
    this.gameEngine = new GameEngine();
    this.shyguyLLM = new ShyGuyLLM();
    this.storyEngine = new StoryEngine();
  }

  run() {
    console.log("[Game]: run");
    this.gameEngine.init();
    // this.gameEngine.run();
    // initialize and start other classes
  }
}
