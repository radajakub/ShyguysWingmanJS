export class GameEngine {
  constructor() {
    this.canvasWidth = 960;
    this.canvasHeight = 640;
    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) {
      console.error("Canvas not found");
    }
    this.ctx = this.canvas.getContext("2d");

    // View management
    this.gameView = document.getElementById("gameView");
    this.dialogueView = document.getElementById("dialogueView");
    this.currentView = "game";

    // Bind methods
    this.switchView = this.switchView.bind(this);

    // Debug controls
    this.initDebugControls();
  }

  init() {
    console.log("init game engine");
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    // Initialize with game view
    this.switchView("game");
  }

  switchView(viewName) {
    if (viewName === this.currentView) return;

    this.currentView = viewName;

    if (viewName === "game") {
      this.gameView.classList.add("active");
      this.dialogueView.classList.remove("active");
    } else if (viewName === "dialogue") {
      this.gameView.classList.remove("active");
      this.dialogueView.classList.add("active");
    }
  }

  // Example methods to use in your code:
  showGameView() {
    this.switchView("game");
  }

  showDialogueView() {
    this.switchView("dialogue");
  }

  initDebugControls() {
    const switchToGameBtn = document.getElementById("switchToGameBtn");
    const switchToDialogueBtn = document.getElementById("switchToDialogueBtn");

    switchToGameBtn.addEventListener("click", () => this.showGameView());
    switchToDialogueBtn.addEventListener("click", () => this.showDialogueView());
  }

  // Update status text
  updateStatus(message) {
    const statusText = document.getElementById("statusText");
    if (statusText) {
      statusText.textContent = message;
    }
  }
}
