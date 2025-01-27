import LLM from "./llm";

export class Shyguy {
    constructor() {
        this.num_beers = 0;
        this.courage = 1;
        this.personality = "This is the Shyguy. He is shy and introverted. He is also a bit of a nerd. He fell in love with Jessica. He never talked to Jessica before.To Jessica, he talks about algorithms. Jessica does not talk about algorithms. He is super shy.";
        this.lessons_learned = "";
        this.conversation_history = "";
        this.song_playing = "Let it be";
        this.imgpath = "assets/assets/shyguy_headshot.jpeg";
        this.met_dj = false;
        this.met_bar = false;
        this.met_sister = false;
        this.last_actions = [];
    }

    getSystemPrompt() {
        if (this.num_beers >= 3) {
            return `${this.personality}. His courage is ${this.courage} on the level 1 to 10. If his courage is higher than 5, he is self-confident. He had too many beers and he is drunk. He talks about how drunk he is. Follow the following lessons: ${this.lessons_learned}. ${this.met_dj ? "He has met the DJ already." : "He has not met the DJ yet."} ${this.met_bar ? "He has met the bartender already." : "He has not met the bartender yet."} ${this.met_sister ? "He has met Jessica's sister already." : "He has not met Jessica's sister yet."}`;
        } else if (this.num_beers == 2) {
            return `This is Shyguy. He had two beers, so he feels relaxed and he can talk with anyone.  ${this.met_dj ? "He has met the DJ already." : "He has not met the DJ yet."} ${this.met_bar ? "He has met the bartender already." : "He has not met the bartender yet."} ${this.met_sister ? "He has met Jessica's sister already." : "He has not met Jessica's sister yet."} Follow the following lessons: ${this.lessons_learned}.`;
        }
        else {
            return `${this.personality}. His courage is ${this.courage} on the level 1 to 10. If his courage is higher than 5, he is self-confident. He is really shy and he fears talking with people. It is not easy to persuade him. He does not want to drink at first. ${this.met_dj ? "He has met the DJ already." : "He has not met the DJ yet."} ${this.met_bar ? "He has met the bartender already." : "He has not met the bartender yet."} ${this.met_sister ? "He has met Jessica's sister already." : "He has not met Jessica's sister yet."} Follow the following lessons: ${this.lessons_learned}.`;
        }
    }

    appendLesson(lesson) {
        this.lessons_learned += lesson + "\n";
        // Keep only last 200 characters of lessons learned if too long
        if (this.lessons_learned.length > 400) {
            this.lessons_learned = this.lessons_learned.slice(-400);
        }
    }

    appendConversationHistory(conversation_history) {
        this.conversation_history += conversation_history + "\n";
    }

    async learnLesson(entityName){
        console.log("Conversation history: ", this.conversation_history);
        if (this.conversation_history === "") {
            return;
        }
        const summaryLLM = new LLM();
        const summary = await summaryLLM.getChatCompletion(
            `Summarize in one sentence what Shyguy should say when talking to ${entityName}. Do not confuse Jessica and Jessica's sister. If there is nothing relevant about what to say to Jessica, say Nothing relevant. Do not hallucinate. Do not make up things.`,
            this.conversation_history
        );
        this.appendLesson(`When talking to ${entityName}, ${summary}`);
    }

    async learnFromWingman(wingman_message) {
        console.log("Wingman message: ", wingman_message);
        const summaryLLM = new LLM();
        const summary = await summaryLLM.getChatCompletion(
            `Summarize in one sentence what is learned from the message. Summary is one sentence. For example, if the wingman says "Let's have a beer", the output should be "Shyguy wants a beer". If the wingman says "Let's have vodka", the output should be "Shyguy wants vodka". If wingman just says "Hi", the output should be "Wingman said hi". Do not hallucinate. Do not make up things.`,
            wingman_message
        );
        console.log("Summary learned from wingman: ", summary);
        this.appendLesson(summary);
    }

    async learnFromConversation(conversation) {
        console.log("Conversation: ", conversation);
        const summaryLLM = new LLM();
        const summary = await summaryLLM.getChatCompletion(
            `Summarize in one sentence what happened in the conversation. Do not hallucinate. Do not make up things.`,
            conversation
        );
        this.appendLesson(summary);
    }

    getAvailableActions() {
        let actions = {};
        const lastAction = this.last_actions[this.last_actions.length - 1];
        console.log("[ShyGuy]: Last action: ", lastAction);

        if (this.num_beers === 0) {
            actions = {
                "go_bar": {
                    description: "Head to the bar.",
                    location: "bar",
                },
                "go_dj": {
                    description: "Go to the DJ",
                    location: "dj_booth",
                },
                "go_home": {
                    description: "Give up and head home",
                    location: "exit",
                },
                "stay_idle": {
                    description: "Stay idle",
                    location: "idle",
                }
            };
        }
        else if (this.num_beers >= 2) {
            // After 2+ beers, all actions except going home are available
            actions = {
                "go_bar": {
                    description: "Go to the bar", 
                    location: "bar",
                },
                "go_dj": {
                    description: "GO to the DJ",
                    location: "dj_booth",
                },
                "go_sister": {
                    description: "Go to Jessica's sister",
                    location: "sister",
                },
                "go_girl": {
                    description: "Go to Jessica",
                    location: "girl",
                }
            };
        } else if (this.num_beers >= 4) {
            actions = {
                "go_girl": {
                    description: "Go to Jessica",
                    location: "girl",
                }
            };
        } else {
            // After 1 beer but less than 2, all actions are available
            actions = {
                "go_bar": {
                    description: "Go to the bar",
                    location: "bar",
                },
                "go_home": {
                    description: "Go home",
                    location: "exit",
                },
                "go_dj": {
                    description: "Go to the DJ",
                    location: "dj_booth",
                },
                "go_sister": {
                    description: "Go to Jessica's sister",
                    location: "sister",
                },
                "go_girl": {
                    description: "Go to Jessica",
                    location: "girl",
                }
            };
        }

        // Remove the last action from available actions
        if (lastAction && actions[lastAction]) {
            delete actions[lastAction];
        }
        console.log("[ShyGuy]: Last actions: ", this.last_actions);
        console.log("[ShyGuy]: Available actions: ", actions);
        return actions;
    }
}