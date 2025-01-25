export class Shyguy {
    constructor() {
        this.num_beers = 0;
        this.courage = 0;
        this.personality = "This is the shy guy. He is shy and introverted. He is also a bit of a nerd.";
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