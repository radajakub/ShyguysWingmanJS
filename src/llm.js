class LLM {
    constructor() {
        this.apiKey = 'orJ3CQG1yFXIwSu4PXgEucaIS72f1upX';
    }

    async getChatCompletion(systemPrompt, userInput) {
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

    async #getFunctionCall(systemPrompt, userInput, tools) {
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
                    tools: tools,
                    tool_choice: "any"  // Forces tool use
                })
            });

            const data = await response.json();
            
            // Extract function call details from the response
            const toolCall = data.choices[0].message.tool_calls[0];
            return {
                functionName: toolCall.function.name,
                arguments: JSON.parse(toolCall.function.arguments),
                toolCallId: toolCall.id
            };

        } catch (error) {
            console.error('Function Call Error:', error);
            throw error;
        }
    }

    async getFunctionKey(functionDescriptions, prompt) {
        // Convert the key-value pairs into the tools format required by the API
        const tools = functionDescriptions.map(({ key, description }) => ({
            type: "function",
            function: {
                name: key,
                description: description,
                parameters: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        }));

        // Use the private getFunctionCall method to make the API call
        const result = await this.#getFunctionCall(
            "You are a helpful assistant. Based on the user's input, choose the most appropriate function to call.",
            prompt,
            tools
        );

        return result.functionName;
    }
}

export default LLM;



// Function call Usage example
// const tools = [
//     {
//         type: "function",
//         function: {
//             name: "someFunction",
//             description: "Description of the function",
//             parameters: {
//                 type: "object",
//                 properties: {
//                     param1: {
//                         type: "string",
//                         description: "Description of param1"
//                     }
//                 },
//                 required: ["param1"]
//             }
//         }
//     }
// ];

// const result = await llm.getFunctionCall(
//     "System prompt",
//     "User input",
//     tools
// );