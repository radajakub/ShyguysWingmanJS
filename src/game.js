import { Shyguy } from "./shyguy.js";
import { GameEngine } from "./game_engine.js";
import { ShyGuyLLM } from "./shyguy_llm.js";
import { StoryEngine } from "./story_engine.js";
import { SpeechToTextClient } from "./speech_to_text.js";
import { ElevenLabsClient } from "./eleven_labs.js";

export class Game {
  constructor() {
    this.firstRun = true;

    this.reset = this.reset.bind(this);
    this.initializeComponents();
  }

  initializeComponents() {
    // Create fresh instances of all components
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
    this.gameEngine.init(this.firstRun);
    this.gameEngine.setResetCallback(this.reset);
    this.gameEngine.playBackgroundMusic();
    this.gameEngine.lowerMusicVolume();
  }

  reset() {
    this.firstRun = false;
    // Clean up old game engine
    if (this.gameEngine) {
      // Remove event listeners and clean up
      document.removeEventListener("keydown", this.gameEngine.handleKeyDown);
      document.removeEventListener("keyup", this.gameEngine.handleKeyUp);
      this.gameEngine.sendButton?.removeEventListener("click", this.gameEngine.handleSendMessage);
      this.gameEngine.dialogueContinueButton?.removeEventListener("click", this.gameEngine.handleDialogueContinue);
      this.gameEngine.playAgainBtn?.removeEventListener("click", this.gameEngine.handlePlayAgain);
      this.gameEngine.microphoneButton?.removeEventListener("click", this.gameEngine.handleMicrophone);
      this.gameEngine.startGameBtn?.removeEventListener("click", this.gameEngine.handleStartGame);
      this.gameEngine.dialogueNextButton?.removeEventListener("click", this.gameEngine.handleDialogueNext);

      // Stop the game loop
      this.gameEngine.shouldContinue = false;
    }

    setTimeout(() => {
      // Create fresh instances
      this.initializeComponents();

      this.run();
    }, 100);
  }
}
