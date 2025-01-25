const WINGMAN_SPEED = 5;
const SHYGUY_SPEED = 0.5;

const IS_DEBUG = true;

// class CustomImage {
//   constructor(imageSrc) {
//     this.image = new Image();

//     this.loadPromise = new Promise((resolve, reject) => {
//       this.image.onload = () => {
//         resolve(this);
//       };
//       this.image.onerror = () => {
//         reject(new Error(`Failed to load image: ${imageSrc}`));
//       };
//     });

//     this.image.src = imageSrc;
//   }

//   async waitForLoad() {
//     return this.loadPromise;
//   }
// }

class SpriteEntity {
  constructor(x0, y0, imageSrc, speed = 0, width = 32, height = 32, frameRate = 8, frameCount = 4) {
    // super(imageSrc);

    this.x = x0;
    this.y = y0;
    this.width = width;
    this.height = height;
    this.image = new Image();
    this.image.src = imageSrc;
    this.frameRate = frameRate;
    this.frameCount = frameCount;

    // properties for the game engine
    this.moving = false;
    this.speed = speed;

    // frame index in the sprite sheet
    this.frameX = 0;
    this.frameY = 0;
  }

  stop() {
    this.moving = false;
  }

  start() {
    this.moving = true;
  }

  setSpeed(speed) {
    this.speed = speed;
  }
}

class GuidedSpriteEntity extends SpriteEntity {
  constructor(x0, y0, imageSrc, speed = 0, width = 32, height = 32, frameRate = 8, frameCount = 4) {
    super(x0, y0, imageSrc, speed, width, height, frameRate, frameCount);
    this.target = null;
  }

  setTarget(target) {
    this.target = target;
  }
}

class SpriteImage {
  constructor(imageSrc, width = 32, height = 32) {
    this.image = new Image();
    this.image.src = imageSrc;
    this.width = width;
    this.height = height;
  }
}

class Target {
  constructor(label, x, y, width, height, color, enabled = true) {
    this.label = label;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.debugColor = color;
    this.enabled = enabled;
  }
}

export class GameEngine {
  constructor(shyguy, shyguyLLM, storyEngine) {
    this.shyguy = shyguy;
    this.shyguyLLM = shyguyLLM;
    this.storyEngine = storyEngine;

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

    this.shouldContinue = true;

    this.gameChatContainer = document.getElementById("chatMessages");
    this.messageInput = document.getElementById("messageInput");
    this.sendButton = document.getElementById("sendButton");
    this.handleSendMessage = this.handleSendMessage.bind(this);

    this.gameFrame = 0;
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    };

    // Bind methods
    this.switchView = this.switchView.bind(this);
    this.update = this.update.bind(this);
    this.draw = this.draw.bind(this);
    this.run = this.run.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.setNewTarget = this.setNewTarget.bind(this);
    this.checkTargetReached = this.checkTargetReached.bind(this);
    this.updateGuidedSpriteDirection = this.updateGuidedSpriteDirection.bind(this);
    this.updateSprite = this.updateSprite.bind(this);
    this.handleSpriteCollision = this.handleSpriteCollision.bind(this);
    this.initDebugControls = this.initDebugControls.bind(this);
    this.stopShyguyAnimation = this.stopShyguyAnimation.bind(this);

    this.pushEnabled = false;

    // Debug controls
    this.initDebugControls();

    // if we have other obstacles, we can add them here
    this.gridMapTypes = {
      floor: 0,
      wall: 1,
    };

    // load assets for drawing the scene
    this.wall = new SpriteImage("/assets/assets/wall-tile.png");
    this.floor = new SpriteImage("/assets/assets/floor-tile.png");

    this.gridCols = Math.ceil(this.canvasWidth / this.wall.width);
    this.gridRows = Math.ceil(this.canvasHeight / this.wall.height);

    // initialize grid map
    this.backgroundGridMap = [];
    this.initBackgroundGridMap();

    // initialize players
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    this.shyguySprite = new GuidedSpriteEntity(cx, cy, "/assets/assets/shyguy.png", SHYGUY_SPEED);
    this.wingmanSprite = new SpriteEntity(
      this.wall.width,
      this.canvasHeight - 2 * this.wall.width,
      "/assets/assets/player.png",
      WINGMAN_SPEED
    );

    this.targets = {
      exit: new Target("exit", this.wall.width, this.wall.height, this.wall.width, this.wall.height, "red", true),
      girl: new Target(
        "girl",
        this.canvasWidth - this.wall.width - this.shyguySprite.width,
        this.canvasHeight / 2 - this.wall.height / 2,
        this.wall.width,
        this.wall.height,
        "pink",
        true
      ),
      bar: new Target(
        "bar",
        this.canvasWidth / 2 - this.wall.width / 2,
        this.canvasHeight - this.wall.height - this.shyguySprite.width,
        this.wall.width,
        this.wall.height,
        "blue",
        true
      ),
      dj: new Target(
        "dj",
        this.wall.width,
        this.canvasHeight / 2 - this.wall.height / 2,
        this.wall.width,
        this.wall.height,
        "green",
        true
      ),
      sister: new Target(
        "sister",
        this.canvasWidth - this.wall.width - this.shyguySprite.width,
        this.wall.height,
        this.wall.width,
        this.wall.height,
        "yellow",
        true
      ),
    };

    // Add game over view
    this.gameOverView = document.getElementById("gameOverView");
    this.playAgainBtn = document.getElementById("playAgainBtn");

    // Bind new method
    this.handlePlayAgain = this.handlePlayAgain.bind(this);

    // Initialize play again button
    this.playAgainBtn.addEventListener("click", this.handlePlayAgain);
  }

  // async loadAssets() {
  //   try {
  //     await Promise.all([
  //       this.wall.waitForLoad(),
  //       this.floor.waitForLoad(),
  //       this.shyguySprite.waitForLoad(),
  //       this.wingmanSprite.waitForLoad(),
  //     ]);
  //   } catch (error) {
  //     console.error("Failed to load assets:", error);
  //   }
  // }

  init() {
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);

    // Initialize with game view
    this.switchView("game");

    this.sendButton.addEventListener("click", this.handleSendMessage);
    // TODO: bind microphone to the input api

    this.run();
    this.shyguySprite.setTarget(this.targets.exit);
  }

  endGame() {
    this.shouldContinue = false;
    this.switchView("gameOver");
  }

  initBackgroundGridMap() {
    for (let row = 0; row < this.gridRows; row++) {
      this.backgroundGridMap[row] = [];
      for (let col = 0; col < this.gridCols; col++) {
        // Set walls and obstacles (in future)
        if (row === 0 || row === this.gridRows - 1 || col === 0 || col === this.gridCols - 1) {
          this.backgroundGridMap[row][col] = this.gridMapTypes.wall;
        } else {
          this.backgroundGridMap[row][col] = this.gridMapTypes.floor;
        }
      }
    }
  }

  checkWallCollision(sprite, newX, newY) {
    const x = newX;
    const y = newY;
    const gridX = Math.floor(x / sprite.width);
    const gridY = Math.floor(y / sprite.height);

    for (let row = gridY; row <= Math.floor((y + sprite.height) / sprite.height); row++) {
      for (let col = gridX; col <= Math.floor((x + sprite.width) / sprite.width); col++) {
        if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
          if (this.backgroundGridMap[row][col] === this.gridMapTypes.wall) {
            return true;
          }
        }
      }
    }

    return false;
  }

  checkSpriteCollision(newX, newY, sprite1, sprite2) {
    return (
      newX < sprite2.x + sprite2.width &&
      newX + sprite1.width > sprite2.x &&
      newY < sprite2.y + sprite2.height &&
      newY + sprite1.height > sprite2.y
    );
  }

  handleSpriteCollision(sprite1, sprite2) {
    if (!this.pushEnabled) {
      return true; // Return true to block movement as before
    }

    // Calculate velocity difference
    let dx = 0;
    let dy = 0;
    if (this.keys.ArrowUp) dy = -sprite1.speed;
    else if (this.keys.ArrowDown) dy = sprite1.speed;
    else if (this.keys.ArrowLeft) dx = -sprite1.speed;
    else if (this.keys.ArrowRight) dx = sprite1.speed;

    // If arrow player isn't moving, stop button player
    if (dx === 0 && dy === 0) {
      return true;
    }

    // Calculate effective push speed (difference in velocities)
    const pushSpeed = Math.max(0, sprite1.speed - sprite2.speed);

    // If arrow player is faster, push button player
    if (pushSpeed > 0) {
      let newX = sprite2.x + (dx !== 0 ? dx : 0);
      let newY = sprite2.y + (dy !== 0 ? dy : 0);

      // Only apply the push if it won't result in a wall collision
      if (!this.checkWallCollision(sprite2, newX, newY)) {
        sprite2.x = newX;
        sprite2.y = newY;
      }
    }

    return true; // Still prevent arrow player from moving through button player
  }

  updateGuidedSprite() {
    if (!this.shyguySprite.target) return;

    const dx = this.shyguySprite.target.x - this.shyguySprite.x;
    const dy = this.shyguySprite.target.y - this.shyguySprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const moveX = (dx / distance) * this.shyguySprite.speed;
    const moveY = (dy / distance) * this.shyguySprite.speed;

    let newX = this.shyguySprite.x + moveX;
    let newY = this.shyguySprite.y + moveY;

    // Check wall collision first
    if (!this.checkWallCollision(this.shyguySprite, newX, newY)) {
      const willCollide = this.checkSpriteCollision(newX, newY, this.shyguySprite, this.wingmanSprite);

      if (willCollide) {
        if (this.pushEnabled) {
          // Push mechanics enabled - try to push wingman
          const pushSpeed = Math.max(0, this.shyguySprite.speed - this.wingmanSprite.speed);

          if (pushSpeed > 0) {
            let wingmanNewX = this.wingmanSprite.x + moveX;
            let wingmanNewY = this.wingmanSprite.y + moveY;

            if (!this.checkWallCollision(this.wingmanSprite, wingmanNewX, wingmanNewY)) {
              this.wingmanSprite.x = wingmanNewX;
              this.wingmanSprite.y = wingmanNewY;
              this.shyguySprite.x = newX;
              this.shyguySprite.y = newY;
              this.shyguySprite.moving = true;
            }
          }
        }

        // If push is disabled or push failed, try to path around
        if (this.shyguySprite.x === newX && this.shyguySprite.y === newY) {
          const leftPath = { x: newX - this.wingmanSprite.width, y: newY };
          const rightPath = { x: newX + this.wingmanSprite.width, y: newY };
          const upPath = { x: newX, y: newY - this.wingmanSprite.height };
          const downPath = { x: newX, y: newY + this.wingmanSprite.height };

          const paths = [leftPath, rightPath, upPath, downPath];
          let bestPath = null;
          let bestDistance = Infinity;

          for (const path of paths) {
            if (
              !this.checkWallCollision(this.shyguySprite, path.x, path.y) &&
              !this.checkSpriteCollision(path.x, path.y, this.shyguySprite, this.wingmanSprite)
            ) {
              const pathDistance = Math.sqrt(
                Math.pow(this.shyguySprite.target.x - path.x, 2) + Math.pow(this.shyguySprite.target.y - path.y, 2)
              );
              if (pathDistance < bestDistance) {
                bestDistance = pathDistance;
                bestPath = path;
              }
            }
          }

          if (bestPath) {
            this.shyguySprite.x = bestPath.x;
            this.shyguySprite.y = bestPath.y;
            this.shyguySprite.moving = true;
          }
        }
      } else {
        // No collision, proceed normally
        this.shyguySprite.x = newX;
        this.shyguySprite.y = newY;
        this.shyguySprite.moving = true;
      }
    }
  }

  updateSprite() {
    let newX = this.wingmanSprite.x;
    let newY = this.wingmanSprite.y;
    let isMoving = false;

    if (this.keys.ArrowUp) {
      newY -= this.wingmanSprite.speed;
      this.wingmanSprite.frameY = 3;
      isMoving = true;
    }
    if (this.keys.ArrowDown) {
      newY += this.wingmanSprite.speed;
      this.wingmanSprite.frameY = 0;
      isMoving = true;
    }
    if (this.keys.ArrowLeft) {
      newX -= this.wingmanSprite.speed;
      this.wingmanSprite.frameY = 1;
      isMoving = true;
    }
    if (this.keys.ArrowRight) {
      newX += this.wingmanSprite.speed;
      this.wingmanSprite.frameY = 2;
      isMoving = true;
    }

    // Check wall collision first
    if (!this.checkWallCollision(this.wingmanSprite, newX, newY)) {
      // Check collision with shyguy
      const willCollide = this.checkSpriteCollision(newX, newY, this.wingmanSprite, this.shyguySprite);

      if (willCollide) {
        if (this.pushEnabled) {
          // Try to push shyguy if push is enabled
          this.handleSpriteCollision(this.wingmanSprite, this.shyguySprite);
        }
        // If push is disabled or push failed, don't move
        return;
      }

      // No collision, proceed with movement
      this.wingmanSprite.x = newX;
      this.wingmanSprite.y = newY;
    }

    this.wingmanSprite.moving = isMoving;
  }

  handleKeyDown(e) {
    if (e.key in this.keys) {
      this.keys[e.key] = true;
      this.wingmanSprite.moving = true;
    }
  }

  handleKeyUp(e) {
    if (e.key in this.keys) {
      this.keys[e.key] = false;
      this.wingmanSprite.moving = Object.values(this.keys).some((key) => key);
    }
  }

  setNewTarget(target) {
    if (target && target.enabled) {
      this.shyguySprite.setTarget(target);
      this.updateGuidedSpriteDirection(this.shyguySprite);
    }
  }

  checkTargetReached(sprite, target) {
    // Calculate sprite center
    const spriteCenterX = sprite.x + sprite.width / 2;
    const spriteCenterY = sprite.y + sprite.height / 2;

    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    // Calculate distance from sprite center to target
    const dx = Math.abs(spriteCenterX - targetCenterX);
    const dy = Math.abs(spriteCenterY - targetCenterY);

    // Check if target is within sprite boundaries
    const isWithinBounds = dx <= sprite.width / 2 && dy <= sprite.height / 2;
    return isWithinBounds;
  }

  updateGuidedSpriteDirection(sprite) {
    if (!sprite.target) return;

    const dx = sprite.target.x - sprite.x;
    const dy = sprite.target.y - sprite.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      sprite.frameY = dx > 0 ? 2 : 1;
    } else {
      sprite.frameY = dy > 0 ? 0 : 3;
    }
  }

  updateSpriteAnimation(sprite) {
    if (sprite.moving) {
      if (this.gameFrame % sprite.frameRate === 0) {
        sprite.frameX = (sprite.frameX + 1) % sprite.frameCount;
      }
    } else {
      sprite.frameX = 0;
    }
  }

  update() {
    this.gameFrame++;

    // Update Shyguy position
    if (this.shyguySprite.target && this.shyguySprite.target.enabled) {
      this.updateGuidedSprite(this.shyguySprite);
      if (this.shyguySprite.moving) {
        this.updateSpriteAnimation(this.shyguySprite);
      }
    }

    // update Wingman position
    this.updateSprite(this.wingmanSprite);
    if (this.wingmanSprite.moving) {
      this.updateSpriteAnimation(this.wingmanSprite);
    }

    for (const target of Object.values(this.targets)) {
      const isClose = this.checkTargetReached(this.shyguySprite, target);

      // TODO: reenable the target so the player can visit it again
      if (!target.enabled) {
        continue;
      }

      if (isClose) {
        target.enabled = false;
        this.stopShyguyAnimation(target);
        if (target.label === "exit") {
          this.endGame();
          // END THE GAME
        } else {
          this.storyEngine.onEncounter(target.label);
        }
        break;
      }
    }
  }

  stopShyguyAnimation(target) {
    this.shyguySprite.ving = false;
    this.shyguySprite.frameX = 0;
    this.shyguySprite.target = null;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw grid map
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const x = col * this.wall.width;
        const y = row * this.wall.height;

        if (this.backgroundGridMap[row][col] === this.gridMapTypes.wall) {
          this.ctx.drawImage(this.wall.image, x, y, this.wall.width, this.wall.height);
        } else if (this.backgroundGridMap[row][col] === this.gridMapTypes.floor) {
          this.ctx.drawImage(this.floor.image, x, y, this.floor.width, this.floor.height);
        }
      }
    }

    // Draw shyguy
    this.ctx.drawImage(
      this.shyguySprite.image,
      this.shyguySprite.frameX * this.shyguySprite.width,
      this.shyguySprite.frameY * this.shyguySprite.height,
      this.shyguySprite.width,
      this.shyguySprite.height,
      this.shyguySprite.x,
      this.shyguySprite.y,
      this.shyguySprite.width,
      this.shyguySprite.height
    );

    // Draw wingman
    this.ctx.drawImage(
      this.wingmanSprite.image,
      this.wingmanSprite.frameX * this.wingmanSprite.width,
      this.wingmanSprite.frameY * this.wingmanSprite.height,
      this.wingmanSprite.width,
      this.wingmanSprite.height,
      this.wingmanSprite.x,
      this.wingmanSprite.y,
      this.wingmanSprite.width,
      this.wingmanSprite.height
    );

    if (IS_DEBUG) {
      for (const target in this.targets) {
        const { x, y, width, height, debugColor } = this.targets[target];
        this.ctx.beginPath();
        this.ctx.arc(x + width / 2, y + height / 2, 10, 0, 2 * Math.PI);
        this.ctx.fillStyle = debugColor;
        this.ctx.fill();
      }
    }
  }

  switchView(viewName) {
    if (viewName === this.currentView) return;

    this.currentView = viewName;

    // Hide all views first
    this.gameView.classList.remove("active");
    this.dialogueView.classList.remove("active");
    this.gameOverView.classList.remove("active");

    // Show the requested view
    switch (viewName) {
      case "game":
        this.gameView.classList.add("active");
        break;
      case "dialogue":
        this.dialogueView.classList.add("active");
        break;
      case "gameOver":
        this.gameOverView.classList.add("active");
        break;
    }
  }

  enablePush() {
    this.pushEnabled = true;
  }

  disablePush() {
    this.pushEnabled = false;
  }

  showGameView() {
    this.switchView("game");
  }

  showDialogueView() {
    this.switchView("dialogue");
  }

  initDebugControls() {
    const switchToGameBtn = document.getElementById("switchToGameBtn");
    const switchToDialogueBtn = document.getElementById("switchToDialogueBtn");
    const targetDoorBtn = document.getElementById("targetDoorBtn");
    const targetGirlBtn = document.getElementById("targetGirlBtn");
    const targetBarBtn = document.getElementById("targetBarBtn");
    const targetDjBtn = document.getElementById("targetDjBtn");
    const targetSisterBtn = document.getElementById("targetSisterBtn");
    const stopNavBtn = document.getElementById("stopNavBtn");
    const togglePushBtn = document.getElementById("togglePushBtn");

    switchToGameBtn.addEventListener("click", () => this.showGameView());
    switchToDialogueBtn.addEventListener("click", () => this.showDialogueView());
    targetDoorBtn.addEventListener("click", () => this.setNewTarget(this.targets.exit));
    targetGirlBtn.addEventListener("click", () => this.setNewTarget(this.targets.girl));
    targetBarBtn.addEventListener("click", () => this.setNewTarget(this.targets.bar));
    targetDjBtn.addEventListener("click", () => this.setNewTarget(this.targets.dj));
    targetSisterBtn.addEventListener("click", () => this.setNewTarget(this.targets.sister));
    stopNavBtn.addEventListener("click", () => this.setNewTarget(null));

    // Add push mechanics toggle
    togglePushBtn.addEventListener("click", () => {
      if (this.pushEnabled) {
        this.disablePush();
      } else {
        this.enablePush();
      }
      togglePushBtn.textContent = this.pushEnabled ? "Disable Push" : "Enable Push";
    });
  }

  // Update status text
  updateStatus(message) {
    const statusText = document.getElementById("statusText");
    if (statusText) {
      statusText.textContent = message;
    }
  }

  clearChat(container) {
    if (container) {
      container.innerHTML = "";
    }
  }

  initMessageHandlers() {
    // Add click handler for send button
  }

  addChatMessage(container, message, isShyguy = false) {
    if (!container) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${isShyguy ? "shyguy" : "wingman"}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = message;

    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);

    // Auto scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  async handleSendMessage() {
    const message = this.messageInput.value.trim();
    this.addChatMessage(this.gameChatContainer, message, false);
    this.messageInput.value = "";

    this.shyguyLLM.getShyGuyResponse(message).then((response) => {
      const dialogue = response.dialogue;
      const action = response.action;

      // TODO: add the messages to the context of the prompts

      // Add message to the chat view
      this.addChatMessage(this.gameChatContainer, dialogue, true);

      console.log("[ShyguyLLM]: Next action: ", action);

      // TODO: resolve the action
      switch (action) {
        case "go_bar":
          this.setNewTarget(this.targets.bar);
          break;
        case "go_dj":
          this.setNewTarget(this.targets.dj);
          break;
        case "go_sister":
          this.setNewTarget(this.targets.sister);
          break;
        case "go_girl":
          this.setNewTarget(this.targets.girl);
          break;
        case "go_home":
          this.setNewTarget(this.targets.exit);
          break;
        default:
          break;
      }
    });
  }

  async run() {
    // wait for 16ms
    await new Promise((resolve) => setTimeout(resolve, 16));
    this.update();
    this.draw();
    if (this.shouldContinue) {
      requestAnimationFrame(this.run);
    }
  }

  handlePlayAgain() {
    // Reset game state
    this.init();
    // Switch back to game view
    this.switchView("game");
  }

  resetGame() {
    // Reset player positions
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    this.shyguySprite.x = cx;
    this.shyguySprite.y = cy;
    this.wingmanSprite.x = this.wall.width;
    this.wingmanSprite.y = this.canvasHeight - 2 * this.wall.width;

    // Reset targets
    Object.values(this.targets).forEach((target) => {
      target.enabled = true;
    });

    // Reset other game state
    this.shouldContinue = true;
    this.shyguySprite.setTarget(this.targets.exit);
  }
}
