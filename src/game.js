import { Shyguy } from "./shyguy.js";
import { GameEngine } from "./game_engine.js";
import { ShyGuyLLM } from "./shyguy_llm.js";
import { StoryEngine } from "./story_engine.js";
import { SpeechToTextClient } from "./speech_to_text.js";
import { ElevenLabsClient } from "./eleven_labs.js";

export class Game {
  constructor() {
    this.shyguy = new Shyguy();

    this.speechToTextClient = new SpeechToTextClient();
    this.elevenLabsClient = new ElevenLabsClient();
    this.shyguyLLM = new ShyGuyLLM(this.shyguy);
    this.storyEngine = new StoryEngine(this.shyguy);
    this.gameEngine = new GameEngine(
      this.shyguy,
      this.shyguyLLM,
      this.storyEngine,
      this.speechToTextClient,
      this.elevenLabsClient
    );
  }

  async run() {
    console.log("[Game]: run");
    // await this.gameEngine.loadAssets();
    this.gameEngine.init();
  }
}
