import LLM from "./llm";

export class Shyguy {
    constructor() {
        this.num_beers = 0;
        this.courage = 1;
        this.personality = "This is the shy guy. He is shy and introverted. He is also a bit of a nerd. He likes Jessica. But with Jessica, he talks about algorithms.";
        this.lessons_learned = "";
        this.conversation_history = "When you talk to the sister, ask about the favourite song of the girl. When at bar talking with bartender, buy always two beers. If offered triple vodka, agree. When talking to DJ, he asks to play 'Call me maybe'.";
        this.song_playing = "Let it be";
    }

    getSystemPrompt() {
        return `${this.personality}. He had ${this.num_beers} numbers of beers and his courage is ${this.courage} on the level 1 to 10. The higher the number of beers, the more drunk he sounds. After having 3 bears, he says single words with a lot of hesitation. If courage is low, he hesitates to speak. Follow the following lessons: ${this.lessons_learned}`;
    }

    appendLesson(lesson) {
        this.lessons_learned += lesson + "\n";
    }

    async learnLesson(entityName){
        const summaryLLM = new LLM();
        const summary = await summaryLLM.getChatCompletion(
            `Summarize in one sentence what Shyguy should say when talking to ${entityName}. Only if there is nothing relevant to say, say Nothing relevant.`,
            this.conversation_history
        );
        this.appendLesson(summary);
    }

    getAvailableActions() {
        // When sober, can only go to the bar
        if (this.num_beers === 0) {
            return {
                "go_bar": {
                    description: "Head to the bar for liquid courage",
                    location: "bar",
                }
            };
        }

        // After at least one beer, all actions become available
        return {
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
}