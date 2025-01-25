// Core Game Engine
class GameEngine {
  constructor() {
      this.stateManager = new StateManager();
      this.renderer = new GameRenderer();
      this.narrativeEngine = new NarrativeEngine();
      this.inputHandler = new InputHandler();
      this.physics = new PhysicsEngine();
      this.audioManager = new AudioManager();
      this.currentMode = 'topDown'; // or 'dialog'
  }

  init() {
      this.stateManager.loadGameState();
      this.setupEventListeners();
      this.startGameLoop();
  }

  startGameLoop() {
      const gameLoop = () => {
          this.update();
          this.render();
          requestAnimationFrame(gameLoop);
      };
      gameLoop();
  }

  update() {
      const deltaTime = this.calculateDeltaTime();
      this.physics.update(deltaTime);
      this.updatePlayerState(deltaTime);
      this.narrativeEngine.update();
  }

  updatePlayerState(deltaTime) {
      const drunkennessLevel = this.stateManager.getState('drunkenness');
      this.physics.applyDrunkEffect(this.shyGuy, drunkennessLevel);
      this.handleCollisions();
  }
}

// State Management
class StateManager {
  constructor() {
      this.gameState = {
          shyGuy: {
              position: { x: 0, y: 0 },
              drunkenness: 0,
              confidence: 0,
              inventory: []
          },
          story: {
              currentChapter: 'start',
              completedObjectives: new Set(),
              npcMemory: new Map()
          },
          partyState: {
              currentSong: null,
              crowdDensity: new Map(),
              activeConversations: []
          }
      };
  }

  saveGameState() {
      localStorage.setItem('gameState', JSON.stringify(this.gameState));
  }

  loadGameState() {
      const savedState = localStorage.getItem('gameState');
      if (savedState) {
          this.gameState = JSON.parse(savedState);
      }
  }
}

// Narrative Engine
class NarrativeEngine {
  constructor() {
      this.storyGraph = new Map();
      this.currentNode = null;
      this.dialogueSystem = new DialogueSystem();
  }

  loadStoryContent() {
      this.storyGraph = {
          'start': {
              text: "There she is. Standing in the corner, looking amazing...",
              choices: [
                  { text: "Maybe I should get a drink first", next: 'bar' },
                  { text: "Let's talk to her sister first", next: 'sister' }
              ]
          }
          // Additional story nodes...
      };
  }

  async handleNPCInteraction(npcId, playerInput) {
      const context = this.buildConversationContext(npcId);
      return await this.dialogueSystem.generateResponse(context, playerInput);
  }
}

// Physics Engine with Drunk Mechanics
class PhysicsEngine {
  constructor() {
      this.gravity = 0.5;
      this.friction = 0.8;
  }

  applyDrunkEffect(entity, drunkennessLevel) {
      const wobble = Math.sin(Date.now() / 500) * drunkennessLevel;
      entity.velocity.x += wobble;
      entity.velocity.y += wobble * 0.5;
      
      // Implement drunk walking physics
      if (entity.isMoving) {
          const randomStagger = (Math.random() - 0.5) * drunkennessLevel;
          entity.rotation += randomStagger;
          entity.velocity.x += Math.cos(entity.rotation) * randomStagger;
          entity.velocity.y += Math.sin(entity.rotation) * randomStagger;
      }
  }
}

// Dialogue System with AI Integration
class DialogueSystem {
  constructor() {
      this.conversationHistory = new Map();
      this.voiceRecognition = new VoiceRecognition();
  }

  async generateResponse(context, playerInput) {
      const prompt = this.buildPrompt(context, playerInput);
      try {
          const response = await this.callLLM(prompt);
          return this.processResponse(response);
      } catch (error) {
          console.error('LLM Error:', error);
          return this.getFallbackResponse();
      }
  }
}

// Game Renderer
class GameRenderer {
  constructor() {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.sprites = new Map();
      this.animations = new Map();
  }

  setMode(mode) {
      this.currentMode = mode;
      this.updateRendererSettings();
  }

  render(gameState) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (this.currentMode === 'topDown') {
          this.renderTopDownView(gameState);
      } else {
          this.renderDialogMode(gameState);
      }
  }

  renderTopDownView(gameState) {
      this.renderPartyEnvironment();
      this.renderCharacters(gameState.characters);
      this.renderParticles();
      this.renderUI(gameState);
  }
}

// Input Handler
class InputHandler {
  constructor() {
      this.keys = new Set();
      this.mousePosition = { x: 0, y: 0 };
      this.setupEventListeners();
  }

  setupEventListeners() {
      window.addEventListener('keydown', (e) => this.keys.add(e.key));
      window.addEventListener('keyup', (e) => this.keys.delete(e.key));
      window.addEventListener('mousemove', (e) => {
          this.mousePosition.x = e.clientX;
          this.mousePosition.y = e.clientY;
      });
  }
}

// Audio Manager
class AudioManager {
  constructor() {
      this.music = new Map();
      this.sfx = new Map();
      this.currentSong = null;
      this.volume = 1.0;
  }

  loadAudio() {
      // Load party music and sound effects
      this.loadPartyTracks();
      this.loadAmbientSounds();
      this.loadInteractionSounds();
  }

  crossFade(fromTrack, toTrack, duration) {
      const steps = 60;
      const volumeStep = 1 / steps;
      let currentStep = 0;

      const fade = setInterval(() => {
          if (currentStep >= steps) {
              clearInterval(fade);
              return;
          }
          
          fromTrack.volume = Math.max(0, fromTrack.volume - volumeStep);
          toTrack.volume = Math.min(1, toTrack.volume + volumeStep);
          currentStep++;
      }, duration / steps);
  }
}

// Export game instance
export const game = new GameEngine();
export default GameEngine;
