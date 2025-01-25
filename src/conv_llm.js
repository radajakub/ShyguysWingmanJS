class ConversationLLM {
    constructor() {
        this.apiKey = 'orJ3CQG1yFXIwSu4PXgEucaIS72f1upX';
    }

    async getResponse(systemPrompt, userInput) {
        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userInput
            }
        ];

        try {
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 150
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('LLM Error:', error);
            throw error;
        }
    }
}


export default ConversationLLM;