import LLM from "./llm";

export class Shyguy {
    constructor() {
        this.num_beers = 0;
        this.courage = 1;
        this.personality = "This is the Shyguy. He is shy and introverted. He is also a bit of a nerd. He fell in love with Jessica. With Jessica, he talks about algorithms. He is super shy.";
        this.lessons_learned = "";
        this.conversation_history = "";
        this.song_playing = "Let it be";
        this.imgpath = "assets/assets/shyguy_headshot.jpeg";
        this.last_actions = [];
    }

    getSystemPrompt() {
        if (this.num_beers >= 3) {
            return `${this.personality}. His courage is ${this.courage} on the level 1 to 10. If his courage is higher than 5, he is self-confident. He had too many beers and he is drunk. He talks about how drunk he is. Follow the following lessons: ${this.lessons_learned}`;
        } else if (this.num_beers == 2) {
            return `This is Shyguy. He had two beers, so he feels relaxed and he can talk with anyone. Follow the following lessons: ${this.lessons_learned}`;
        }
        else {
            return `${this.personality}. His courage is ${this.courage} on the level 1 to 10. If his courage is higher than 5, he is self-confident. He is really shy and he fears talking with people. It is not easy to persuade him. He doe not want to drink at first.Follow the following lessons: ${this.lessons_learned}`;
        }
    }

    appendLesson(lesson) {
        this.lessons_learned += lesson + "\n";
    }

    appendConversationHistory(conversation_history) {
        this.conversation_history += conversation_history + "\n";
    }

    async learnLesson(entityName){
        const summaryLLM = new LLM();
        const summary = await summaryLLM.getChatCompletion(
            `Summarize in one sentence what Shyguy should say when talking to ${entityName}. Do not confuse Jessica and Jessica's sister. If there is nothing relevant about what to say to Jessica, say Nothing relevant.`,
            this.conversation_history
        );
        this.appendLesson(`When talking to ${entityName}, ${summary}`);
    }

    async learnFromWingman(wingman_message) {
        const summaryLLM = new LLM();
        console.log("Wingman message: ", wingman_message);
        const summary = await summaryLLM.getChatCompletion(
            `Give a summary of what is learned from the message. Summary is one sentence. The wingman is always talking. For example, if the wingman says "Let's have a beer", the output should be "Shyguy wants a beer". If the wingman says "Let's have vodka", the output should be "Shyguy wants vodka".`,
            wingman_message
        );
        this.appendLesson(summary);
    }

    getAvailableActions() {
        let actions = {};
        const lastAction = this.last_actions[this.last_actions.length - 1];

        // When sober, can only go to the bar or home
        if (this.num_beers === 0) {
            actions = {
                "go_bar": {
                    description: "Head to the bar.",
                    location: "bar",
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
                    description: "Head to the bar for liquid courage", 
                    location: "bar",
                },
                "go_dj": {
                    description: "Talk to the DJ about playing a song",
                    location: "dj_booth",
                },
                "go_sister": {
                    description: "Approach your crush's sister",
                    location: "sister",
                },
                "go_girl": {
                    description: "Approach your crush",
                    location: "girl",
                }
            };
        } else {
            // After 1 beer but less than 2, all actions are available
            actions = {
                "go_bar": {
                    description: "Head to the bar for liquid courage",
                    location: "bar",
                },
                "go_home": {
                    description: "Give up and head home",
                    location: "exit",
                },
                "go_dj": {
                    description: "Talk to the DJ about playing a song",
                    location: "dj_booth",
                },
                "go_sister": {
                    description: "Approach your crush's sister",
                    location: "sister",
                },
                "go_girl": {
                    description: "Approach your crush",
                    location: "girl",
                }
            };
        }

        // Remove the last action from available actions
        if (lastAction && actions[lastAction]) {
            delete actions[lastAction];
        }

        return actions;
    }
}