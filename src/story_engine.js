import Shyguy from './shyguy';
import Sister from './sister';
import ConversationLLM from './conversation_llm';

class Bar {
    constructor() {
        this.personality = "This is the bar. It is a bit of a dive bar. It is also a bit of a nerd.";
        this.past_conversation = "";
        this.imgpath = "assets/bar.png";
        this.output_format_prompt = "Return a json with parameters conversation and num_beers. TODO";
    }
}

class DJ {
    constructor() {
        this.personality = "This is the DJ. He is a bit of a nerd. He is also a bit of a nerd.";
        this.past_conversation = "";
        this.imgpath = "assets/dj.png";
        this.output_format_prompt = "Return a json with parameters conversation and new_song. TODO";
    }
}

class Sister {
  constructor() {
      // Initialize Sister properties
      this.mood = 0;
      this.personality = "This is the sister. She is a deeply religious Christian. She is helpful in her second answer, her first answer is a bit mean.";
      this.past_conversation = "";
  }

  // Getter method
  getMood() {
      return this.mood;
  }

  // Setter method 
  setMood(mood) {
      this.mood = mood;
  }
}

class StoryEngine {
  constructor(shyguy) {
    // Initialize story engine properties with provided shyguy instance
    this.shyguy = shyguy;
    this.sister = new Sister();
    this.conversation_llm = new ConversationLLM();
    this.bar = new Bar();
    this.dj = new DJ();
  }

  onEncounter(entity) {
    switch (entity) {
      case "sister":
        this.sisterInteraction();
        break;
      case "bar":
        this.barInteraction();
        break;
      case "girl":
        this.girlInteraction();
        break;
      case "dj":
        this.djInteraction();
        break;
      default:
        console.log("Unknown entity encountered");
    }
  }

  getShyguyPersonalityPrompt() {
    return `${this.shyguy.personality} He had ${this.shyguy.beers} beers and his courage is ${this.shyguy.courage} on the level 1 to 10.`;
  }

  sisterInteraction() {
    const shyguyPersonalityPrompt = this.getShyguyPersonalityPrompt();
    const sisterPersonalityPrompt = `${this.sister.personality}. Her mood is ${this.sister.mood} on the level 1 to 10.`;
    const conversation_json = this.conversation_llm.generate_conversation(shyguyPersonalityPrompt, sisterPersonalityPrompt, this.sister.past_conversation, this.sister.output_format_prompt, 3);
    const conversation = conversation_json.conversation;
    const gameOver = conversation_json.game_over;
    this.sister.past_conversation += conversation;
    return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.sister.imgpath, gameOver: gameOver};
  }

  barInteraction() {
    const shyguyPersonalityPrompt = this.getShyguyPersonalityPrompt();
    const barPersonalityPrompt = `${this.bar.personality}. `;
    const conversation_json = this.conversation_llm.generate_conversation(shyguyPersonalityPrompt, barPersonalityPrompt, this.bar.past_conversation, this.bar.output_format_prompt, 3);
    const conversation = conversation_json.conversation;
    const gameOver = conversation_json.game_over;
    this.bar.past_conversation += conversation;
    return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.bar.imgpath, gameOver: gameOver};
  }

  girlInteraction() {
    const shyguyPersonalityPrompt = this.getShyguyPersonalityPrompt();
    const girlPersonalityPrompt = `${this.girl.personality}.`;
    const conversation_json = this.conversation_llm.generate_conversation(shyguyPersonalityPrompt, girlPersonalityPrompt, this.girl.past_conversation, this.girl.output_format_prompt, 3);
    const conversation = conversation_json.conversation;
    const gameOver = conversation_json.game_over;
    this.girl.past_conversation += conversation;
    return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.girl.imgpath, gameOver: gameOver};
  }

  djInteraction() {
    const shyguyPersonalityPrompt = this.getShyguyPersonalityPrompt();
    const djPersonalityPrompt = `${this.dj.personality}.`;
    const conversation_json = this.conversation_llm.generate_conversation(shyguyPersonalityPrompt, djPersonalityPrompt, this.dj.past_conversation, this.dj.output_format_prompt, 3);
    const conversation = conversation_json.conversation;
    const new_song = conversation_json.new_song;
    this.dj.past_conversation += conversation;
    return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.dj.imgpath, new_song: new_song};
  }
}
