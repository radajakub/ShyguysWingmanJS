const WINGMAN_SPEED = 5;
const SHYGUY_SPEED = 0.5;

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
  constructor(label, x, y, width, height) {
    this.label = label;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

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

    this.pushEnabled = false;

    // Debug controls
    this.initDebugControls();

    // if we have other obstacles, we can add them here
    this.gridMapTypes = {
      floor: 0,
      wall: 1,
    };

    // load assets for drawing the scene
    this.wall = new SpriteImage("/assets/wall-tile.png");
    this.floor = new SpriteImage("/assets/floor-tile.png");

    this.gridCols = Math.ceil(this.canvasWidth / this.wall.width);
    this.gridRows = Math.ceil(this.canvasHeight / this.wall.height);

    // initialize grid map
    this.backgroundGridMap = [];
    this.initBackgroundGridMap();

    // initialize players
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    this.shyguySprite = new GuidedSpriteEntity(cx, cy, "/assets/shyguy.png", SHYGUY_SPEED);
    this.wingmanSprite = new SpriteEntity(
      this.wall.width,
      this.canvasHeight - 2 * this.wall.width,
      "/assets/player.png",
      WINGMAN_SPEED
    );

    this.targets = {
      door: new Target("door", this.wall.width, this.wall.height, this.wall.width, this.wall.height),
      girl: new Target(
        "girl",
        this.canvasWidth - this.wall.width - this.shyguySprite.width,
        this.canvasHeight / 2 - this.wall.height / 2,
        this.wall.width,
        this.wall.height
      ),
    };
  }

  init() {
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);

    // Initialize with game view
    this.switchView("game");
    this.run();
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

    if (this.checkTargetReached(this.shyguySprite)) {
      this.shyguySprite.x = this.shyguySprite.target.x;
      this.shyguySprite.y = this.shyguySprite.target.y;
      this.shyguySprite.moving = false;
      this.shyguySprite.frameX = 0;
      this.shyguySprite.target.reached = true;
      this.shyguySprite.target = null;
      return;
    }

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
    console.log(this.keys);
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
    this.shyguySprite.setTarget(target);
    this.updateGuidedSpriteDirection(this.shyguySprite);
  }

  checkTargetReached(sprite) {
    // Calculate sprite center
    const spriteCenterX = sprite.x + sprite.width / 2;
    const spriteCenterY = sprite.y + sprite.height / 2;

    const targetCenterX = sprite.target.x + sprite.target.width / 2;
    const targetCenterY = sprite.target.y + sprite.target.height / 2;

    // Calculate distance from sprite center to target
    const dx = Math.abs(spriteCenterX - targetCenterX);
    const dy = Math.abs(spriteCenterY - targetCenterY);

    // Check if target is within sprite boundaries
    const isWithinBounds = dx <= sprite.width / 2 && dy <= sprite.height / 2;
    if (isWithinBounds) {
      console.log("target reached", sprite.target.label);
    }
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
    if (this.shyguySprite.target) {
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
        const { x, y, width, height } = this.targets[target];
        this.ctx.beginPath();
        this.ctx.arc(x + width / 2, y + height / 2, 10, 0, 2 * Math.PI);
        this.ctx.fillStyle = "red";
        this.ctx.fill();
      }
    }
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
    const stopNavBtn = document.getElementById("stopNavBtn");
    const togglePushBtn = document.getElementById("togglePushBtn");

    switchToGameBtn.addEventListener("click", () => this.showGameView());
    switchToDialogueBtn.addEventListener("click", () => this.showDialogueView());
    targetDoorBtn.addEventListener("click", () => this.setNewTarget(this.targets.door));
    targetGirlBtn.addEventListener("click", () => this.setNewTarget(this.targets.girl));
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

  async run() {
    // wait for 16ms
    await new Promise((resolve) => setTimeout(resolve, 16));
    this.update();
    this.draw();
    requestAnimationFrame(this.run);
  }
}
