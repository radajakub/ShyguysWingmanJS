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
        this.personality = "This is the DJ. He is very nice and helpful.";
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
      this.situation_prompt = "This is a conversation with the sister.";
      this.personality = "This is the sister. She is a deeply religious Christian. She is helpful in her second answer, her first answer is rude. If asked about the favourite song of the girl, she says it is 'Shape of you'.";
      // this.past_conversation = "";
      this.imgpath = "assets/sister.png";
      this.functionDescriptions = [{
          key: "analyzeMood",
          description: "Analyze the conversation to determine the mood of the sister on the scale 1 to 10. Also determine if the game is over.",
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
      this.functionPrompt = "";
  }

  getSystemPrompt() {
    return `${this.personality}. Her mood is ${this.mood} on the level 1 to 10. If the mood is low, she will be rude. If the mood is high, she will be helpful.`;
  }
}

export class StoryEngine {
  constructor(shyguy) {
    // Initialize story engine properties with provided shyguy instance
    this.shyguy = shyguy;
    this.sister = new Sister();
    this.bar = new Bar();
    this.dj = new DJ();
  }

  onEncounter(entity) {
    switch (entity) {
      case "sister":
        this.generalInteraction(this.sister);
        break;
      case "bar":
        this.generalInteraction(this.bar);
        break;
      case "girl":
        this.generalInteraction(this.girl);
        break;
      case "dj":
        this.generalInteraction(this.dj);
        break;
      default:
        console.log("Unknown entity encountered");
    }
  }

  async generalInteraction(targetEntity){
    await this.shyguy.learnLesson(targetEntity.name);
    console.log(this.shyguy.getSystemPrompt());
    console.log(this.shyguy.lessons_learned);
    const conversation_llm = new ConversationLLM("Shyguy", 
          targetEntity.name, 
          this.shyguy.getSystemPrompt(), 
          targetEntity.getSystemPrompt(), 
          targetEntity.situation_prompt,
          targetEntity.output_format_prompt,
          targetEntity.functionDescriptions,
          targetEntity.functionPrompt);
    const conversation_json = await conversation_llm.generateConversation(6);
    const conversation = conversation_json.conversation;
    const gameOver = conversation_json.game_over;
    targetEntity.past_conversation += conversation;
    console.log(conversation_json);

    return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: targetEntity.imgpath, gameOver: gameOver};
  }

//   sisterInteraction() {
//     const shyguyPersonalityPrompt = this.getShyguyPersonalityPrompt();
//     const sisterPrompt = this.sister.getSystemPrompt();
//     const conversation_llm = new ConversationLLM("Shyguy", "Sister", shyguyPersonalityPrompt, sisterPrompt, this.sister.output_format_prompt);
//     const conversation_json = conversation_llm.generateConversation(3);
//     const conversation = conversation_json.conversation;
//     const gameOver = conversation_json.game_over;
//     this.sister.past_conversation += conversation;
//     return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.sister.imgpath, gameOver: gameOver};
//   }

//   barInteraction() {
//     const shyguyPersonalityPrompt = this.shyguy.getSystemPrompt();
//     const barPrompt = this.bar.getSystemPrompt();
//     const conversation_llm = new ConversationLLM("Shyguy", "Bar", shyguyPersonalityPrompt, barPrompt, this.bar.output_format_prompt);
//     const conversation_json = conversation_llm.generateConversation(3);
//     const conversation = conversation_json.conversation;
//     const gameOver = conversation_json.game_over;
//     this.bar.past_conversation += conversation;
//     console.log(conversation_json);
//     return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.bar.imgpath, gameOver: gameOver};
//   }

//   girlInteraction() {
//     const shyguyPersonalityPrompt = this.getShyguyPersonalityPrompt();
//     const girlPersonalityPrompt = `${this.girl.personality}.`;
//     const conversation_llm = new ConversationLLM("Shyguy", "Girl", shyguyPersonalityPrompt, girlPersonalityPrompt, this.girl.output_format_prompt);
//     const conversation_json = conversation_llm.generateConversation(3);
//     const conversation = conversation_json.conversation;
//     const gameOver = conversation_json.game_over;
//     this.girl.past_conversation += conversation;
//     return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.girl.imgpath, gameOver: gameOver};
//   }

//   djInteraction() {
//     const shyguyPersonalityPrompt = this.getShyguyPersonalityPrompt();
//     const djPersonalityPrompt = `${this.dj.personality}.`;
//     const conversation_llm = new ConversationLLM("Shyguy", "DJ", shyguyPersonalityPrompt, djPersonalityPrompt, this.dj.output_format_prompt);
//     const conversation_json = conversation_llm.generateConversation(3);
//     const conversation = conversation_json.conversation;
//     const new_song = conversation_json.new_song;
//     this.dj.past_conversation += conversation;
//     return {conversation: conversation, char1imgpath: this.shyguy.imgpath, char2imgpath: this.dj.imgpath, new_song: new_song};
//   }
}