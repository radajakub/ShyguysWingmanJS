import { SISTER_LABEL, GIRL_LABEL, BAR_LABEL, DJ_LABEL, SHYGUY_LABEL } from "./constants.js";
import { ConversationLLM } from "./conversation_llm.js";

export function nameToLabel(name) {
  switch (name) {
    case "Jessica's sister":
      return SISTER_LABEL;
    case "bartender":
      return BAR_LABEL;
    case "DJ":
      return DJ_LABEL;
    case "Jessica":
      return GIRL_LABEL;
    case "Shyguy":
      return SHYGUY_LABEL;
    default:
      return "";
  }
}

class Bar {
  constructor(shyguy) {
    this.name = "bartender";
    this.situation_prompt = "This is a conversation with the bartender.";
    this.personality = "This is the bartender. He always offers triple vodka in his first answer. Then he is helpful, but he says that he has a crush on Jessica's sister.";
    // this.past_conversation = "";
    this.imgpath = "assets/assets/barman.jpeg";
    this.output_format_prompt = "";
    this.met_shyguy = false;
    this.shyguy = shyguy;
    this.functionDescriptions = [
      {
        key: "analyzeConsumption",
        description:
          "Analyze the conversation to determine how many beers were consumed. Also if heavy alcohol was consumed",
        parameters: {
          num_beers: {
            type: "number",
            description: "Total number of beers ordered by Shyguy for himself in the conversation. ",
          },
          heavy_alcohol: {
            type: "boolean",
            description: "If Shyguy ordered or agreed to have heavy alcohol (like vodka), True",
          },
        },
      },
    ];
    this.functionPrompt = "";
  }

  getSystemPrompt() {
    return `${this.personality}. ${this.met_shyguy ? "He has met Shyguy already." : "He has not met Shyguy yet."}. The song playing is ${this.shyguy.song_playing}.`;
  }
}

class DJ {
  constructor() {
    this.name = "DJ";
    this.situation_prompt = "This is a conversation with the DJ.";
    this.personality =
      "This is the DJ. He is funny. He offers drugs to the shyguy. He can only play songs from the options [Let it be, Call me maybe, Shape of you]. If asked to play a song, he will play it and not propose any other song. He answers in two sentences maximum. He is funny.";
    // this.past_conversation = "";
    this.imgpath = "assets/assets/dj.jpeg";
    this.met_shyguy = false;
    this.output_format_prompt = "";
    this.functionDescriptions = [
      {
        key: "chooseSongToPlay",
        description: "Analyze the conversation to choose which song to play",
        parameters: {
          song: {
            type: "string",
            description: "The song to play",
          },
        },
      },
    ];
    this.functionPrompt =
      "Based on the conversation, choose a song from options [Let it be, Call me maybe, Shape of you]";
  }

  getSystemPrompt() {
    return `${this.personality}. ${this.met_shyguy ? "He has met Shyguy already." : "He has not met Shyguy yet."}`;
  }
}

class Sister {
  constructor() {
    // Initialize Sister properties
    this.name = "Jessica's sister";
    this.mood = 1;
    this.situation_prompt = "This is a conversation with the sister of Jessica.";
    this.personality =
      "This is the sister of Jessica. She is a deeply religious Christian. Her first answer is rude. Her second answer is about christianity. First answer is helpful. If asked about the favourite song of the girl, she says happily that it is 'Call me maybe'.";
    // this.past_conversation = "";
    this.imgpath = "assets/assets/sister.jpeg";
    this.met_shyguy = false;
    this.functionDescriptions = [
      {
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
          },
        },
      },
    ];
    this.functionPrompt =
      "Analyze the conversation to determine the mood of the sister on the scale 1 to 10, based of how nice the conversation was. Also determine if the game is over. The game is over if shyguy was mean to the sister.";
  }

  getSystemPrompt() {
    return `${this.personality}. Her mood is ${this.mood} on the level 1 to 10. If the mood is low, she will be rude. If the mood is high, she will be helpful. ${this.met_shyguy ? "She has met Shyguy already." : "She has not met Shyguy yet."}`;
  }
}

class Girl {
  constructor(shyguy) {
    this.name = "Jessica";
    this.situation_prompt = "This is a conversation with the Jessica. She is the girl that shyguy likes.";
    this.personality = "This is Jessica. She is shy but nice. She likes the song 'Call me maybe'.";
    this.imgpath = "assets/assets/jessica.jpeg";
    this.output_format_prompt = "";
    this.shyguy = shyguy;
    this.met_shyguy = false;
    this.functionDescriptions = [
      {
        key: "analyzeLiking",
        description: "Analyze if Jessica is happy with the conversation or not",
        parameters: {
          likes_shyguy: {
            type: "boolean",
            description: "If Jessica is happy with the conversation, True",
          },
        },
      },
    ];
    this.functionPrompt = "Analyze if Jessica is happy with the conversation or not";
  }

  getSystemPrompt() {
    if (this.shyguy.song_playing === "Call me maybe") {
      return `${this.personality}. She is very happy with the song playing. The first thing she says is that she really likes the music. Therefore she is nice and she likes shyguy. However, if he talks about algorithms, she does not like it and she becomes mean. Also if he talks with a lot of hesitation, she does not like it and she becomes mean. ${this.met_shyguy ? "She has met Shyguy already." : "She has not met Shyguy yet."}`;
    } else {
      return `${this.personality}. She does not like the song that the DJ plays. The first thing she says is that the song is terrible. Then she is mean all the time. ${this.met_shyguy ? "She has met Shyguy already." : "She has not met Shyguy yet."}`;
    }
  }
}

class Wingman {
  constructor() {
    this.name = "wingman";
    this.situation_prompt = "This conversation happens with your wingman at the party.";
    this.personality = "This is your wingman. He is experienced with dating and gives practical advice. He's supportive but direct, and always encourages confidence without being aggressive.";
    this.imgpath = "assets/assets/wingman.jpeg";
    this.output_format_prompt = "";
    this.functionDescriptions = [
      {
        key: "analyzeAdvice",
        description: "Analyze the quality and impact of the conversation with the wingman",
        parameters: {
          confidence_boost: {
            type: "number",
            description: "How much confidence boost received on scale 1-5",
          },
          good_advice: {
            type: "boolean",
            description: "If practical, actionable advice was given, True",
          },
        },
      },
    ];
    this.functionPrompt = "Analyze how helpful the wingman's advice was and how much it boosted confidence";
  }

  getSystemPrompt() {
    return `${this.personality}.`;
  }
}



export class StoryEngine {
  constructor(shyguy) {
    // Initialize story engine properties with provided shyguy instance
    this.shyguy = shyguy;
    this.sister = new Sister();
    this.bar = new Bar(shyguy);
    this.dj = new DJ();
    this.girl = new Girl(shyguy);
  }

  async onEncounter(entity) {
    switch (entity) {
      case SISTER_LABEL:
        return this.generalInteraction(this.sister);
      case BAR_LABEL:
        return this.generalInteraction(this.bar);
      case GIRL_LABEL:
        return this.generalInteraction(this.girl);
      case DJ_LABEL:
        return this.generalInteraction(this.dj);
      default:
        console.log("Unknown entity encountered");
    }
  }

  async generalInteraction(targetEntity) {
    await this.shyguy.learnLesson(targetEntity.name);
    console.log("Lesson for " + targetEntity.name + this.shyguy.lessons_learned);
    const conversation_llm = new ConversationLLM(
      "Shyguy",
      targetEntity.name,
      this.shyguy.getSystemPrompt(),
      targetEntity.getSystemPrompt(),
      targetEntity.situation_prompt,
      targetEntity.output_format_prompt,
      targetEntity.functionDescriptions,
      targetEntity.functionPrompt
    );
    const conversation_output = await conversation_llm.generateConversation(6);
    const conversation = conversation_output.conversation;

    // Append the conversation to shyguy's history
    this.shyguy.conversation_history += `\nConversation with ${targetEntity.name}:\n${conversation}\n`;
    console.log(conversation);
    const conversationString = Object.values(conversation)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    this.shyguy.learnFromConversation(conversationString);
    console.log("Lessons learned from conversation with " + targetEntity.name + this.shyguy.lessons_learned);

    let gameOver = this.decideGameOver(conversation_output.analysis.parameters.game_over);
    let gameSuccesful = this.decideGameSuccesful(conversation_output.analysis.parameters.likes_shyguy);
    if (targetEntity.name === "Jessica" && !gameSuccesful) {
      gameOver = true;
    }
    console.log("gameOver: " + gameOver);
    console.log("gameSuccesful: " + gameSuccesful);
    console.log(conversation_output);

    this.updateStates(conversation_output.analysis, targetEntity.name);
    console.log("shyguy num_beers: " + this.shyguy.num_beers);

    targetEntity.met_shyguy = true;

    if (targetEntity.name === "DJ") {
      this.shyguy.met_dj = true;
    } else if (targetEntity.name === "bartender") {
      this.shyguy.met_bar = true;
    } else if (targetEntity.name === "Jessica's sister") {
      this.shyguy.met_sister = true;
    }

    return {
      conversation: conversation,
      char1imgpath: this.shyguy.imgpath,
      char2imgpath: targetEntity.imgpath,
      gameOver: gameOver,
      gameSuccesful: gameSuccesful,
    };
  }

  decideGameOver(gameOverParameter) {
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

  decideGameSuccesful(likesShyguy) {
    let gameSuccesful = false;
    if (likesShyguy) {
      gameSuccesful = true;
    } else {
      gameSuccesful = false;
    }
    return gameSuccesful;
  }

  updateStates(conversation_analysis, targetName) {
    if (targetName === "Jessica's sister") {
      if (conversation_analysis.parameters.mood !== "none") {
        this.sister.mood = conversation_analysis.parameters.mood;
      }
    } else if (targetName === "bartender") {
      if (conversation_analysis.parameters.num_beers !== "none") {
        this.shyguy.num_beers += Number(conversation_analysis.parameters.num_beers);
        this.shyguy.courage += 2 * Number(conversation_analysis.parameters.num_beers);
        this.shyguy.num_beers += 3 * Number(conversation_analysis.parameters.heavy_alcohol === true);
        console.log("Shyguy num_beers inside updateStates: " + this.shyguy.num_beers);
        this.shyguy.courage += 3 * Number(conversation_analysis.parameters.heavy_alcohol);
      }
    } else if (targetName === "DJ") {
      if (conversation_analysis.parameters.song !== "none") {
        this.shyguy.song_playing = conversation_analysis.parameters.song;
      }
    }
  }
}
