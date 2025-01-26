import { BAR_LABEL, DJ_LABEL, EXIT_LABEL, GIRL_LABEL, SISTER_LABEL, WINGMAN_LABEL, SHYGUY_LABEL } from "./constants";
import { nameToLabel } from "./story_engine.js";

const WINGMAN_SPEED = 5;
const SHYGUY_SPEED = 0.1;

const IS_DEBUG = true;

class SpriteEntity {
  constructor(x0, y0, imageSrc, speed = 0, width = 32, height = 32, frameRate = 8, frameCount = 4) {
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
  constructor(shyguy, shyguyLLM, storyEngine, speechToTextClient, elevenLabsClient) {
    this.shyguy = shyguy;
    this.shyguyLLM = shyguyLLM;
    this.storyEngine = storyEngine;
    this.speechToTextClient = speechToTextClient;
    this.elevenLabsClient = elevenLabsClient;

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

    this.gameOver = false;
    this.gameSuccessful = false;

    this.gameChatContainer = document.getElementById("chatMessages");
    this.messageInput = document.getElementById("messageInput");
    this.sendButton = document.getElementById("sendButton");
    this.microphoneButton = document.getElementById("micButton");
    this.gameOverImage = document.getElementById("gameOverImage");
    this.gameOverText = document.getElementById("gameOverText");

    this.dialogueChatContainer = document.getElementById("dialogueMessages");
    this.dialogueContinueButton = document.getElementById("dialogueContinueButton");

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
    this.handlePlayAgain = this.handlePlayAgain.bind(this);
    this.handleMicrophone = this.handleMicrophone.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleMicrophone = this.handleMicrophone.bind(this);
    this.handleDialogueContinue = this.handleDialogueContinue.bind(this);
    this.handleStartGame = this.handleStartGame.bind(this);
    this.setGameOver = this.setGameOver.bind(this);

    this.pushEnabled = false;
    this.voiceEnabled = !IS_DEBUG;

    // Debug controls
    this.initDebugControls();

    // if we have other obstacles, we can add them here
    this.gridMapTypes = {
      floor: 0,
      wall: 1,
      door: 2,
    };

    // load assets for drawing the scene
    this.wall = new SpriteImage("/assets/assets/wall_sprite.png");
    this.floor = new SpriteImage("/assets/assets/floor-tile.png");
    this.door = new SpriteImage("/assets/assets/door_sprite.png");

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

    this.jessicaSprite = new SpriteImage("/assets/assets/jessica_sprite.png", 64, 64);
    this.djSprite = new SpriteImage("/assets/assets/dj_sprite.png", 64, 64);
    this.barSprite = new SpriteImage("/assets/assets/bar_sprite.png", 64, 64);
    this.sisterSprite = new SpriteImage("/assets/assets/sister_sprite.png", 64, 64);

    this.targets = {
      exit: new Target(EXIT_LABEL, this.wall.width, this.wall.height, this.wall.width, this.wall.height, "red", true),
      girl: new Target(
        GIRL_LABEL,
        this.canvasWidth - this.wall.width - this.jessicaSprite.width,
        (this.canvasHeight - this.wall.height - this.jessicaSprite.height) / 2,
        this.jessicaSprite.width,
        this.jessicaSprite.height,
        "pink",
        true
      ),
      bar: new Target(
        BAR_LABEL,
        (this.canvasWidth - this.wall.width - this.barSprite.width) / 2,
        this.wall.height,
        this.barSprite.width,
        this.barSprite.height,
        "blue",
        true
      ),
      dj: new Target(
        DJ_LABEL,
        this.wall.width,
        (this.canvasHeight - this.wall.height - this.djSprite.height) / 2,
        this.djSprite.width,
        this.djSprite.height,
        "green",
        true
      ),
      sister: new Target(
        SISTER_LABEL,
        this.canvasWidth - this.wall.width - this.sisterSprite.width,
        this.wall.height,
        this.sisterSprite.width,
        this.sisterSprite.height,
        "yellow",
        true
      ),
    };

    // Add game over view
    this.gameOverView = document.getElementById("gameOverView");
    this.playAgainBtn = document.getElementById("playAgainBtn");

    this.isRecording = false;

    // Add these lines
    this.introView = document.getElementById("introView");
    this.startGameBtn = document.getElementById("startGameBtn");
  }

  init(firstRun = true) {
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);

    // Initialize with game view

    this.sendButton.addEventListener("click", this.handleSendMessage);
    this.dialogueContinueButton.addEventListener("click", this.handleDialogueContinue);
    this.playAgainBtn.addEventListener("click", this.handlePlayAgain);
    this.microphoneButton.addEventListener("click", this.handleMicrophone);

    if (firstRun) {
      this.startGameBtn.addEventListener("click", this.handleStartGame);
      this.switchView("intro");
    } else {
      if (this.currentView !== "game") {
        this.switchView("game");
      }
      this.run();
      this.shyguySprite.setTarget(this.targets.exit);
    }
  }

  async handleStartGame() {
    this.switchView("game");
    this.run();
    this.shyguySprite.setTarget(this.targets.exit);
  }

  setResetCallback(func) {
    this.resetCallback = func;
  }

  resetGame() {
    if (this.resetCallback) {
      this.resetCallback();
    }
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
    this.backgroundGridMap[0][1] = this.gridMapTypes.door;
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
    if (!target) {
      this.shyguySprite.setTarget(null);
    }
  }

  checkTargetReached(sprite, target) {
    // Check if sprite overlaps with target using AABB collision detection
    const spriteLeft = sprite.x;
    const spriteRight = sprite.x + sprite.width;
    const spriteTop = sprite.y;
    const spriteBottom = sprite.y + sprite.height;

    const targetLeft = target.x;
    const targetRight = target.x + target.width;
    const targetTop = target.y;
    const targetBottom = target.y + target.height;

    // Check for overlap on both x and y axes
    const xOverlap = spriteRight >= targetLeft && spriteLeft <= targetRight;
    const yOverlap = spriteBottom >= targetTop && spriteTop <= targetBottom;

    return xOverlap && yOverlap;
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

  async update() {
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
        // pause the game
        target.enabled = false;
        this.stopShyguyAnimation(target);

        if (target.label === EXIT_LABEL) {
          this.gameOver = true;
          this.gameSuccessful = false;
          this.setGameOver(true);
          this.switchView("gameOver");
        } else {
          await this.handleDialogueWithStoryEngine(target.label);
        }
        break;
      }
    }
  }

  async handleDialogueWithStoryEngine(label) {
    this.switchView("dialogue");
    this.hideContinueButton();
    const response = await this.storyEngine.onEncounter(label);

    console.log("[StoryEngine]: onEncounter", response);

    // Update character images
    const leftCharacterImg = document.getElementById("leftCharacterImg");
    const rightCharacterImg = document.getElementById("rightCharacterImg");

    if (leftCharacterImg && response.char1imgpath) {
      leftCharacterImg.src = response.char1imgpath;
      leftCharacterImg.style.display = "block";
    }

    if (rightCharacterImg && response.char2imgpath) {
      rightCharacterImg.src = response.char2imgpath;
      rightCharacterImg.style.display = "block";
    }

    const conversation = response.conversation;

    // TODO: set the images if they are available

    for (const message of conversation) {
      const { role, content } = message;
      const label = nameToLabel(role);
      this.addChatMessage(this.dialogueChatContainer, content, label, true);

      // Only play audio if voice is enabled
      if (this.voiceEnabled) {
        try {
          await this.elevenLabsClient.playAudioForCharacter(label, content);
        } catch (error) {
          console.error("Error playing audio:", label);
        }
      }
    }

    this.gameOver = response.gameOver;
    this.gameSuccessful = response.gameSuccesful;

    this.showContinueButton();
  }

  stopShyguyAnimation(target) {
    this.shyguySprite.moving = false;
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
        } else if (this.backgroundGridMap[row][col] === this.gridMapTypes.door) {
          this.ctx.drawImage(this.door.image, x, y, this.door.width, this.door.height);
        }
      }
    }

    this.drawTargetSprite(this.jessicaSprite, this.targets.girl);
    this.drawTargetSprite(this.barSprite, this.targets.bar);
    this.drawTargetSprite(this.djSprite, this.targets.dj);
    this.drawTargetSprite(this.sisterSprite, this.targets.sister);

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
  }

  drawTargetSprite(sprite, target) {
    this.ctx.drawImage(sprite.image, target.x, target.y, target.width, target.height);
  }

  switchView(viewName) {
    if (viewName === this.currentView) return;

    this.currentView = viewName;

    // Hide all views first
    this.introView.classList.remove("active");
    this.gameView.classList.remove("active");
    this.dialogueView.classList.remove("active");
    this.gameOverView.classList.remove("active");

    // Show the requested view
    switch (viewName) {
      case "intro":
        this.introView.classList.add("active");
        break;
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

  initDebugControls() {
    const targetDoorBtn = document.getElementById("targetDoorBtn");
    const targetGirlBtn = document.getElementById("targetGirlBtn");
    const targetBarBtn = document.getElementById("targetBarBtn");
    const targetDjBtn = document.getElementById("targetDjBtn");
    const targetSisterBtn = document.getElementById("targetSisterBtn");
    const stopNavBtn = document.getElementById("stopNavBtn");
    const togglePushBtn = document.getElementById("togglePushBtn");
    const speedBoostBtn = document.getElementById("speedBoostBtn");
    const toggleVoiceBtn = document.getElementById("toggleVoiceBtn");

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

    // Add speed boost toggle
    speedBoostBtn.addEventListener("click", () => {
      if (this.shyguySprite.speed === SHYGUY_SPEED) {
        this.shyguySprite.setSpeed(10);
        speedBoostBtn.textContent = "Normal Speed";
      } else {
        this.shyguySprite.setSpeed(SHYGUY_SPEED);
        speedBoostBtn.textContent = "Speed Boost";
      }
    });

    // Add voice toggle handler
    toggleVoiceBtn.addEventListener("click", () => {
      this.voiceEnabled = !this.voiceEnabled;
      toggleVoiceBtn.textContent = this.voiceEnabled ? "Disable Voice" : "Enable Voice";
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

  addChatMessage(container, message, character, shyguyIsMain) {
    if (!container) return;

    const isMain = shyguyIsMain ? character === SHYGUY_LABEL : character !== SHYGUY_LABEL;

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${isMain ? "right-user" : "left-user"}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = message;

    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);

    // Auto scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  resolveAction(action) {
    // TODO: resolve the action
    switch (action) {
      case "stay_idle":
        this.setNewTarget(null);
        break;
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
  }

  async sendMessageToShyguy(message) {
    this.addChatMessage(this.gameChatContainer, message, WINGMAN_LABEL, false);
    this.messageInput.value = "";

    this.shyguyLLM.getShyGuyResponse(message).then(async (response) => {
      const dialogue = response.dialogue;
      const action = response.action;

      this.addChatMessage(this.gameChatContainer, dialogue, SHYGUY_LABEL, false);

      // Only play audio if voice is enabled
      if (this.voiceEnabled) {
        this.disableGameInput();
        await this.elevenLabsClient.playAudioForCharacter(SHYGUY_LABEL, dialogue);
        this.enableGameInput();
      }

      // TODO: save conversation history

      console.log("[ShyguyLLM]: Next action: ", action);
      this.resolveAction(action);
    });
  }

  async handleSendMessage() {
    const message = this.messageInput.value.trim();
    if (message.length === 0) return;
    this.sendMessageToShyguy(message);
  }

  async run() {
    // wait for 16ms
    await new Promise((resolve) => setTimeout(resolve, 16));
    await this.update();
    this.draw();
    if (this.shouldContinue) {
      requestAnimationFrame(this.run);
    }
  }

  handlePlayAgain() {
    this.resetGame();
    this.switchView("game");
  }

  async handleMicrophone() {
    if (!this.isRecording) {
      // Start recording
      this.isRecording = true;
      this.microphoneButton.classList.add("recording");
      this.microphoneButton.innerHTML = '<i class="fas fa-stop"></i>';

      await this.speechToTextClient.startRecording();
    } else {
      // Stop recording
      this.isRecording = false;
      this.microphoneButton.classList.remove("recording");
      this.microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';

      const result = await this.speechToTextClient.stopRecording();
      this.sendMessageToShyguy(result.text);
    }
  }

  showContinueButton() {
    this.dialogueContinueButton.style.display = "block";
  }

  hideContinueButton() {
    this.dialogueContinueButton.style.display = "none";
  }

  setGameOver(fromExit) {
    if (this.gameSuccessful) {
      this.gameOverImage.src = "assets/assets/victory.png";
    } else {
      this.gameOverImage.src = "assets/assets/game-over.png";
    }

    if (fromExit) {
      this.gameOverText.textContent = "You lost! Shyguy ran away!";
      return;
    }

    this.gameOverText.textContent = this.gameSuccessful
      ? "You won! Shyguy got a date!"
      : "You lost! Shyguy got rejected!";
  }

  handleDialogueContinue() {
    this.clearChat(this.dialogueChatContainer);

    // Hide character images
    const leftCharacterImg = document.getElementById("leftCharacterImg");
    const rightCharacterImg = document.getElementById("rightCharacterImg");

    if (leftCharacterImg) {
      leftCharacterImg.style.display = "none";
    }
    if (rightCharacterImg) {
      rightCharacterImg.style.display = "none";
    }

    // decide if game is over
    if (this.gameOver) {
      this.setGameOver(false);
      this.switchView("gameOver");
      return;
    }

    // Enable push if shyguy has had at least one beer
    if (this.shyguy.num_beers > 0) {
      this.enablePush();
    }

    this.switchView("game");
    this.shyguyLLM.getShyGuyResponse("").then((response) => {
      console.log("[ShyguyLLM]: Next action: ", response);
      const next_action = response.action;

      console.log("response after dialogue", response);

      this.resolveAction(next_action);
    });
  }

  disableGameInput() {
    this.sendButton.setAttribute("disabled", "");
    this.microphoneButton.setAttribute("disabled", "");
    this.messageInput.setAttribute("disabled", "");
  }

  enableGameInput() {
    this.sendButton.removeAttribute("disabled");
    this.microphoneButton.removeAttribute("disabled");
    this.messageInput.removeAttribute("disabled");
  }
}
