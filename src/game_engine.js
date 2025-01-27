import { BAR_LABEL, DJ_LABEL, EXIT_LABEL, GIRL_LABEL, SISTER_LABEL, WINGMAN_LABEL, SHYGUY_LABEL } from "./constants";
import { nameToLabel } from "./story_engine.js";

const WINGMAN_SPEED = 5;
const SHYGUY_SPEED = 1;

const IS_DEBUG = false;

class SpriteEntity {
  constructor(x0, y0, imageSrc, speed = 0, width = 24, height = 64, frameRate = 8, frameCount = 1) {
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
    this.frameY = 0; // 0 for right, 1 for left
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
  constructor(x0, y0, imageSrc, speed = 0, width = 24, height = 64, frameRate = 8, frameCount = 1) {
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
  static introMessages = [
    {
      message:
        "Hey man, this is really not my cup of tea. I see Jessica in the corner, I wonder if I can finally tell her I love her.",
      character: SHYGUY_LABEL,
    },
    {
      message: "Man, tonight is your night. I'll get you through it and you'll go home with Jessica.",
      character: WINGMAN_LABEL,
    },
    {
      message: "Geez, that's impossible! Even if I replay the night a million times, I couldn't do it.",
      character: SHYGUY_LABEL,
    },
    {
      message: "Okay, just follow my advice! I'll push you around if needed.",
      character: WINGMAN_LABEL,
    },
  ];

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
    this.dialogueNextButton = document.getElementById("dialogueNextButton");

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
    this.handleFirstStartGame = this.handleFirstStartGame.bind(this);
    this.setGameOver = this.setGameOver.bind(this);
    this.handleDialogueNext = this.handleDialogueNext.bind(this);

    this.pushEnabled = false;
    this.voiceEnabled = !IS_DEBUG;

    // Debug controls
    this.initDebugControls();

    // configure environment building blocks and enable passing them
    this.gridMapTypes = {
      floor: { index: 0, passable: true },
      wall: { index: 1, passable: false },
      door: { index: 2, passable: false },
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
    this.shyguySprite = new GuidedSpriteEntity(cx, cy, "/assets/assets/shyguy_sprite.png", SHYGUY_SPEED);
    this.wingmanSprite = new SpriteEntity(
      this.wall.width,
      this.canvasHeight - this.wall.height - 64,
      "/assets/assets/wingman_sprite.png",
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

    this.backgroundMusic = new Audio("assets/assets/tiny-steps-danijel-zambo-main-version-1433-01-48.mp3");
    this.backgroundMusic.loop = true;

    this.gameOverMusic = new Audio("/assets/assets/game-over-8bit-music-danijel-zambo-1-00-16.mp3");
    this.gameOverMusic.loop = false;

    this.victoryMusic = new Audio("/assets/assets/moonlit-whispers-theo-gerard-main-version-35960-02-34.mp3");
    this.victoryMusic.loop = false;

    // Move character images to class state
    this.leftCharacterImg = document.getElementById("leftCharacterImg");
    this.rightCharacterImg = document.getElementById("rightCharacterImg");
    this.hideCharacterImages();
  }

  showCharacterImages() {
    this.leftCharacterImg.style.display = "block";
    this.rightCharacterImg.style.display = "block";
  }

  hideCharacterImages() {
    this.leftCharacterImg.style.display = "none";
    this.rightCharacterImg.style.display = "none";
  }

  init(firstRun = true) {
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);

    // Initialize with game view
    const intialStatusText =
      "You are playing as the Wingman. You can move around using arrow keys. Maybe Shyguy will listen to you or let you follow him around. Don't let him leave without the girl!";
    this.updateStatus(intialStatusText);

    this.sendButton.addEventListener("click", this.handleSendMessage);
    this.dialogueContinueButton.addEventListener("click", this.handleDialogueContinue);
    this.dialogueNextButton.addEventListener("click", this.handleDialogueNext);
    this.playAgainBtn.addEventListener("click", this.handlePlayAgain);
    this.microphoneButton.addEventListener("click", this.handleMicrophone);

    if (firstRun) {
      this.startGameBtn.addEventListener("click", this.handleFirstStartGame);
      this.switchView("intro");
    } else {
      if (this.currentView !== "game") {
        this.switchView("game");
      }
      this.run();
      this.shyguySprite.setTarget(this.targets.exit);
    }
  }

  async handleFirstStartGame() {
    this.switchView("dialogue");
    this.leftCharacterImg.src = "/assets/assets/wingman.jpeg";
    this.rightCharacterImg.src = "/assets/assets/shyguy_headshot.jpeg";
    this.showCharacterImages();
    this.hideContinueButton();

    for (const introMessage of GameEngine.introMessages) {
      const { message, character } = introMessage;
      this.addChatMessage(this.dialogueChatContainer, message, character, true);
      if (this.voiceEnabled) {
        await this.elevenLabsClient.playAudioForCharacter(character, message);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.showNextButton();
  }

  showNextButton() {
    if (this.dialogueNextButton) {
      this.dialogueNextButton.style.display = "block";
    }
  }

  hideNextButton() {
    if (this.dialogueNextButton) {
      this.dialogueNextButton.style.display = "none";
    }
  }

  handleDialogueNext() {
    this.clearChat(this.dialogueChatContainer);
    this.leftCharacterImg.src = "";
    this.rightCharacterImg.src = "";
    this.hideCharacterImages();
    this.hideNextButton();
    this.showContinueButton();
    this.handleStartGame();
  }

  async handleStartGame() {
    this.switchView("game");
    this.playBackgroundMusic();
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
          this.backgroundGridMap[row][col] = this.gridMapTypes.wall.index;
        } else {
          this.backgroundGridMap[row][col] = this.gridMapTypes.floor.index;
        }
      }
    }
    this.backgroundGridMap[0][1] = this.gridMapTypes.door.index;
  }

  checkWallCollision(sprite, newX, newY) {
    const x = newX;
    const y = newY;
    // For a sprite twice as big as grid, divide by half the sprite width/height
    const gridX = Math.floor(x / (sprite.width * 1.33));
    const gridY = Math.floor(y / (sprite.height / 2));

    // Check all grid cells the sprite overlaps
    // For a sprite twice as big, it can overlap up to 4 cells
    for (let row = gridY; row <= Math.floor((y + sprite.height) / (sprite.height / 2)); row++) {
      for (let col = gridX; col <= Math.floor((x + sprite.width) / (sprite.width * 1.33)); col++) {
        if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
          const cellType = this.backgroundGridMap[row][col];
          const typeInfo = Object.values(this.gridMapTypes).find((type) => type.index === cellType);
          if (typeInfo && !typeInfo.passable) {
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
      isMoving = true;
    }
    if (this.keys.ArrowDown) {
      newY += this.wingmanSprite.speed;
      isMoving = true;
    }
    if (this.keys.ArrowLeft) {
      newX -= this.wingmanSprite.speed;
      this.wingmanSprite.frameY = 0; // left
      isMoving = true;
    }
    if (this.keys.ArrowRight) {
      newX += this.wingmanSprite.speed;
      this.wingmanSprite.frameY = 1; // right
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
    // Only handle arrow keys for player movement if the text input is not focused
    if (e.key in this.keys && !document.activeElement.matches('input[type="text"], textarea')) {
      this.keys[e.key] = true;
      this.wingmanSprite.moving = true;
    } else if (e.key === "Enter" && this.currentView === "game" && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
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

    // Update direction based only on horizontal movement
    if (dx !== 0) {
      sprite.frameY = dx > 0 ? 1 : 0; // 0 for right, 1 for left
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
        if (!isClose) {
          target.enabled = true;
        }
        continue;
      }

      if (isClose) {
        // pause the game
        target.enabled = false;
        this.stopShyguyAnimation();

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

    // Show loading indicator
    const dialogueBox = document.querySelector(".dialogue-box");
    dialogueBox.classList.add("loading");

    const response = await this.storyEngine.onEncounter(label);

    // Hide loading indicator
    dialogueBox.classList.remove("loading");

    // Update character images using class properties
    if (this.leftCharacterImg && response.char2imgpath) {
      this.leftCharacterImg.src = response.char2imgpath;
      this.leftCharacterImg.style.display = "block";
    }

    if (this.rightCharacterImg && response.char1imgpath) {
      this.rightCharacterImg.src = response.char1imgpath;
      this.rightCharacterImg.style.display = "block";
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
          this.lowerMusicVolumeALot();
          await this.elevenLabsClient.playAudioForCharacter(label, content);
          this.restoreMusicVolume();
        } catch (error) {
          console.error("Error playing audio:", label);
        }
      }
    }

    if (response.gameSuccesful) {
      this.gameOver = true;
      this.gameSuccessful = true;
    } else if (response.gameOver) {
      this.gameOver = true;
      this.gameSuccessful = false;
    } else {
      this.gameOver = false;
      this.gameSuccessful = false;
    }

    this.showContinueButton();
  }

  stopShyguyAnimation() {
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

        if (this.backgroundGridMap[row][col] === this.gridMapTypes.wall.index) {
          this.ctx.drawImage(this.wall.image, x, y, this.wall.width, this.wall.height);
        } else if (this.backgroundGridMap[row][col] === this.gridMapTypes.floor.index) {
          this.ctx.drawImage(this.floor.image, x, y, this.floor.width, this.floor.height);
        } else if (this.backgroundGridMap[row][col] === this.gridMapTypes.door.index) {
          this.ctx.drawImage(this.door.image, x, y, this.door.width, this.door.height);
        }
      }
    }

    // Draw npcs with targets
    this.drawTargetSprite(this.jessicaSprite, this.targets.girl);
    this.drawTargetSprite(this.barSprite, this.targets.bar);
    this.drawTargetSprite(this.djSprite, this.targets.dj);
    this.drawTargetSprite(this.sisterSprite, this.targets.sister);

    // Draw shyguy
    this.drawPlayerSprite(this.shyguySprite);

    // Draw wingman
    this.drawPlayerSprite(this.wingmanSprite);
  }

  drawTargetSprite(sprite, target) {
    this.ctx.drawImage(sprite.image, target.x, target.y, target.width, target.height);
  }

  drawPlayerSprite(sprite) {
    this.ctx.drawImage(
      sprite.image,
      sprite.frameX * sprite.width,
      sprite.frameY * sprite.height,
      sprite.width,
      sprite.height,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height
    );
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
    const debugControls = document.getElementById("debugControls");
    if (!IS_DEBUG) {
      if (debugControls) {
        debugControls.style.display = "none";
      }
      return;
    }

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
        this.lowerMusicVolumeALot();
        await this.elevenLabsClient.playAudioForCharacter(SHYGUY_LABEL, dialogue);
        this.enableGameInput();
        this.restoreMusicVolume();
      }

      // TODO: save conversation history
      await this.shyguy.learnFromWingman(message);
      console.log("[ShyguyLLM]: Next action: ", action);
      this.shyguy.last_actions.push(action);
      if (this.shyguy.num_beers >= 1) {
        console.log("Updating status to: Shyguy is drunk. Try pushing him.");
        this.updateStatus("Shyguy is drunk. Try pushing him.");
      }
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
    this.clearChat(this.gameChatContainer);
    this.resetGame();
    this.stopGameOverMusic();
    this.switchView("game");
  }

  async handleMicrophone() {
    if (!this.isRecording) {
      // Start recording
      this.isRecording = true;
      this.microphoneButton.classList.add("recording");
      this.microphoneButton.innerHTML = '<i class="fas fa-stop"></i>';

      // Lower music volume while recording
      this.lowerMusicVolumeALot();
      await this.speechToTextClient.startRecording();
    } else {
      // Stop recording
      this.isRecording = false;
      this.microphoneButton.classList.remove("recording");
      this.microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';

      const result = await this.speechToTextClient.stopRecording();
      // Restore music volume after recording
      this.restoreMusicVolume();
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
    this.stopBackgroundMusic();

    if (this.gameSuccessful) {
      this.gameOverImage.src = "assets/assets/victory.png";
      this.playVictoryMusic();
    } else {
      this.gameOverImage.src = "assets/assets/game-over.png";
      this.playGameOverMusic();
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
    this.shyguyLLM.getShyGuyResponse("Where do you go next? Your available actions are: " + this.shyguy.getAvailableActions()).then((response) => {
      const next_action = response.action;
      if (this.shyguy.num_beers >= 1) {
        console.log("Updating status to: Shyguy is drunk. Try pushing him.");
        this.updateStatus("Shyguy is drunk. Try pushing him.");
      }
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

  playBackgroundMusic() {
    this.backgroundMusic.play().catch((error) => {
      console.error("Error playing background music:", error);
    });
  }

  stopBackgroundMusic() {
    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
  }

  playGameOverMusic() {
    this.gameOverMusic.play().catch((error) => {
      console.error("Error playing game over music:", error);
    });
  }

  playVictoryMusic() {
    this.victoryMusic.play().catch((error) => {
      console.error("Error playing victory music:", error);
    });
  }

  stopGameOverMusic() {
    this.gameOverMusic.pause();
    this.gameOverMusic.currentTime = 0;
    this.victoryMusic.pause();
    this.victoryMusic.currentTime = 0;
  }

  stopAllMusic() {
    this.stopBackgroundMusic();
    this.stopGameOverMusic();
  }

  lowerMusicVolume() {
    // Store original volumes if not already stored
    if (!this.originalVolumes) {
      this.originalVolumes = {
        background: this.backgroundMusic.volume,
        gameOver: this.gameOverMusic.volume,
        victory: this.victoryMusic.volume,
      };
    }

    // Lower all music volumes to 20% of their original values
    this.backgroundMusic.volume = this.originalVolumes.background * 0.2;
    this.gameOverMusic.volume = this.originalVolumes.gameOver * 0.2;
    this.victoryMusic.volume = this.originalVolumes.victory * 0.2;
  }
  lowerMusicVolumeALot() {
    // Store original volumes if not already stored
    if (!this.originalVolumes) {
      this.originalVolumes = {
        background: this.backgroundMusic.volume,
        gameOver: this.gameOverMusic.volume,
        victory: this.victoryMusic.volume,
      };
    }

    // Lower all music volumes to 20% of their original values
    this.backgroundMusic.volume = this.originalVolumes.background * 0.01;
    this.gameOverMusic.volume = this.originalVolumes.gameOver * 0.01;
    this.victoryMusic.volume = this.originalVolumes.victory * 0.01;
  }

  restoreMusicVolume() {
    // Restore original volumes if they exist
    if (this.originalVolumes) {
      this.backgroundMusic.volume = this.originalVolumes.background * 0.2;
      this.gameOverMusic.volume = this.originalVolumes.gameOver * 0.2;
      this.victoryMusic.volume = this.originalVolumes.victory * 0.2;
    }
  }
}
