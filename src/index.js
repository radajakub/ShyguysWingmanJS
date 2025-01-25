import { Game } from "./game.js";

// start the game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("[index]: DOMContentLoaded");

  const game = new Game();
  game.run();
});
