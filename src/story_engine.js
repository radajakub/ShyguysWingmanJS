import { ConversationLLM } from "./conversation_llm";

class Bar {
    constructor() {
        this.name = "bartender";
        this.situation_prompt = "This conversation happens at the bar."
        this.personality = "This is the bartender. He always offers triple vodka in his first answer.";
        // this.past_conversation = "";
        this.imgpath = "assets/bartender.png";
        this.output_format_prompt = "";
        this.functionDescriptions = [{
                key: "analyzeBeerConsumption",
                description: "Analyze the conversation to determine how many beers were consumed",
                parameters: {
                    num_beers: {
                        type: "number",
                        description: "Total number of beers mentioned as being consumed in the conversation"
                    },
                }
            }];
        this.functionPrompt = "";
    }

    getSystemPrompt() {
        return `${this.personality}.`;
    }
}

class DJ {
    constructor() {
        this.name = "DJ";
        this.situation_prompt = "This is a conversation with the DJ.";
        this.personality = "This is the DJ. He is very nice and helpful. He can only play songs from the options [Let it be, Call me maybe, Shape of you]. If asked to play a song, he will play it and not propose any other song.";
        // this.past_conversation = "";
        this.imgpath = "assets/dj.png";
        this.output_format_prompt = "";
        this.functionDescriptions = [{
            key: "chooseSongToPlay",
            description: "Analyze the conversation to choose which song to play",
            parameters: {
                song: {
                    type: "string",
                    description: "The song to play",
                },
            }
        }];
        this.functionPrompt = "Based on the conversation, choose a song from options [Let it be, Call me maybe, Shape of you]";
    }

    getSystemPrompt() {
        return `${this.personality}`;
    }
}

class Sister {
  constructor() {
      // Initialize Sister properties
      this.name = "sister";
      this.mood = 1;
      this.situation_prompt = "This is a conversation with the sister of Jessica.";
      this.personality = "This is the sister of Jessica. She is a deeply religious Christian. She is helpful in her second answer, her first answer is rude. If asked about the favourite song of the girl, she says it is 'Call me maybe'.";
      // this.past_conversation = "";
      this.imgpath = "assets/sister.png";
      this.functionDescriptions = [{
          key: "analyzeMood",
          description: "Mood of the sister and gameover",
          parameters: {
              mood: {
                  type: "number",
                  description: "The mood of the sister on the scale of 1 to 10",
              },
              game_over: {
                  type: "boolean",
                  description: "Whether the game is over",
              }
          }
      }];
      this.functionPrompt = "Analyze the conversation to determine the mood of the sister on the scale 1 to 10, based of how nice the conversation was. Also determine if the game is over. The game is over if shyguy was mean to the sister.";
  }

  getSystemPrompt() {
    return `${this.personality}. Her mood is ${this.mood} on the level 1 to 10. If the mood is low, she will be rude. If the mood is high, she will be helpful.`;
  }
}

class Girl {
  constructor(shyguy) {
    this.name = "Jessica";
    this.situation_prompt = "This is a conversation with the Jessica. She is the girl that shyguy likes.";
    this.personality = "This is Jessica. She is shy but nice. She likes the song 'Call me maybe'.";
    this.imgpath = "assets/girl.png";
    this.output_format_prompt = "";
    this.shyguy = shyguy;
    this.functionDescriptions = [{
      key: "analyzeLiking",
      description: "Analyze if the conversation is nice or not",
      parameters: {
        likes_shyguy: {
          type: "boolean",
          description: "If the conversation is nice, True",
        },
      }
    }];
    this.functionPrompt = "Analyze if the conversation is nice or not.";
  }

  getSystemPrompt() {
    if (this.shyguy.song_playing === "Call me maybe") {
      return `${this.personality}. She is very happy with the song playing. The first thing she says is that she really likes the music. Therefore she is nice and she likes shyguy. However, if he talks about algorithms, she does not like it and she becomes mean.`;
    }
    else {
      return `${this.personality}. She does not like the song that shyguy is playing. The first thing she says is that the song is terrible. Then she is mean all the time.`;
    }
  }
}

export class StoryEngine {
  constructor(shyguy) {
    // Initialize story engine properties with provided shyguy instance
    this.shyguy = shyguy;
    this.sister = new Sister();
    this.bar = new Bar();
    this.dj = new DJ();
    this.girl = new Girl(shyguy);
  }

  async onEncounter(entity) {
    switch (entity) {
      case "sister":
        return this.generalInteraction(this.sister);
      case "bar":
        return this.generalInteraction(this.bar);
      case "girl":
        return await this.generalInteraction(this.girl);
      case "DJ":
        return await this.generalInteraction(this.dj);
      default:
        console.log("Unknown entity encountered");
    }
  }

  async generalInteraction(targetEntity){
    await this.shyguy.learnLesson(targetEntity.name);
    const conversation_llm = new ConversationLLM("Shyguy", 
          targetEntity.name, 
          this.shyguy.getSystemPrompt(), 
          targetEntity.getSystemPrompt(), 
          targetEntity.situation_prompt,
          targetEntity.output_format_prompt,
          targetEntity.functionDescriptions,
          targetEntity.functionPrompt);
    const conversation_output = await conversation_llm.generateConversation(6);
    const conversation = conversation_output.conversation;
    
    let gameOver = this.decideGameOver(conversation_output.analysis.parameters.game_over);
    let gameSuccesful = this.decideGameSuccesful(conversation_output.analysis.parameters.likes_shyguy);
    if (targetEntity.name === "Jessica" && (!gameSuccesful)) {
      gameOver = true;
    }
    console.log("gameOver: " + gameOver);
    console.log("gameSuccesful: " + gameSuccesful);
    console.log(conversation_output);
    
    this.updateStates(conversation_output.analysis, targetEntity.name);
    return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: targetEntity.imgpath, gameOver: gameOver, gameSuccesful: gameSuccesful};
  }

  decideGameOver(gameOverParameter){
    let gameOver = false;
    if (gameOverParameter === "none") {
      gameOver = false;
    } else if (gameOverParameter === true) {
      gameOver = true;
    } else {
      gameOver = false;
    }
    return gameOver;
  }

  decideGameSuccesful(likesShyguy){
    let gameSuccesful = false;
    if (likesShyguy) {
      gameSuccesful = true;
    }
    else {
      gameSuccesful = false;
    }
    return gameSuccesful;
  }

  updateStates(conversation_analysis, targetName){
    if (targetName === "sister"){
      if (conversation_analysis.parameters.mood !== "none") {
        this.sister.mood = conversation_analysis.parameters.mood;
      }
    }
    else if (targetName === "bartender"){
      if (conversation_analysis.parameters.num_beers !== "none") {
        this.shyguy.num_beers += Number(conversation_analysis.parameters.num_beers);
        console.log("Shyguy num_beers inside updateStates: " + this.shyguy.num_beers);
      }
    }
    else if (targetName === "DJ"){
      if (conversation_analysis.parameters.song !== "none") {
        this.shyguy.song_playing = conversation_analysis.parameters.song;
      }
    }
  }
}
