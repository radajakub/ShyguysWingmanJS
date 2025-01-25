import LLM from "./llm";

export class Shyguy {
    constructor() {
        this.num_beers = 0;
        this.courage = 1;
        this.personality = "This is the shy guy. He is shy and introverted. He is also a bit of a nerd.";
        this.lessons_learned = "";
        this.conversation_history = "When you talk to the sister, ask about the favourite song of the girl. When at bar, buy two beers.";
    }

    getSystemPrompt() {
        return `${this.personality}. He had ${this.num_beers} numbers of beers and his courage is ${this.courage} on the level 1 to 10. Follow the following lessons: ${this.lessons_learned}`;
    }

    appendLesson(lesson) {
        this.lessons_learned += lesson;
    }

    async learnLesson(entityName){
        const summaryLLM = new LLM();
        const summary = await summaryLLM.getChatCompletion(
            "Summarize in one sentence what Shyguy should say when talking to " + entityName,
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