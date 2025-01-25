import { Shyguy } from "./shyguy.js";
import { GameEngine } from "./game_engine.js";
import { ShyGuyLLM } from "./shyguy_llm.js";
import { StoryEngine } from "./story_engine.js";

export class Game {
  constructor() {
    this.shyguy = new Shyguy();

    this.shyguyLLM = new ShyGuyLLM(this.shyguy);
    this.storyEngine = new StoryEngine(this.shyguy);
    this.gameEngine = new GameEngine(this.shyguy, this.shyguyLLM, this.storyEngine);
  }

  async run() {
    console.log("[Game]: run");
    // await this.gameEngine.loadAssets();
    this.gameEngine.init();
  }
}
