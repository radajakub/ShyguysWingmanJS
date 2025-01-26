import { MISTRAL_API_KEY } from "../api.js";

export class LLM {
  constructor() {
    this.apiKey = MISTRAL_API_KEY;
  }

  async getChatCompletion(systemPrompt, userInput) {
    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userInput,
      },
    ];

    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: messages,
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("LLM Error:", error);
      throw error;
    }
  }

  async #getFunctionCall(systemPrompt, userInput, tools) {
    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userInput,
      },
    ];

    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: messages,
          tools: tools,
          tool_choice: "any", // Forces tool use
        }),
      });

      const data = await response.json();

      // Extract function call details from the response
      const toolCall = data.choices[0].message.tool_calls[0];
      return {
        functionName: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
        toolCallId: toolCall.id,
      };
    } catch (error) {
      console.error("Function Call Error:", error);
      throw error;
    }
  }

  async getFunctionKey(functionDescriptions, prompt) {
    // Convert the key-value pairs into the tools format required by the API
    const tools = functionDescriptions.map(({ key, description, parameters = {} }) => ({
      type: "function",
      function: {
        name: key,
        description: description,
        parameters: {
          type: "object",
          properties: {
            ...Object.fromEntries(
              Object.entries(parameters).map(([paramName, paramConfig]) => [
                paramName,
                {
                  type: paramConfig.type || "string", // Use provided type or default to "string"
                  description: paramConfig.description,
                },
              ])
            ),
          },
          required: Object.keys(parameters), // Make all parameters required
        },
      },
    }));

    // Use the private getFunctionCall method to make the API call
    const result = await this.#getFunctionCall(
      "You are a helpful assistant. Based on the user's input, choose the most appropriate function to call.",
      prompt,
      tools
    );

    return {
      functionName: result.functionName,
      parameters: result.arguments,
    };
  }

  async getJsonCompletion(systemPrompt, userInput) {
    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userInput,
      },
    ];

    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: messages,
          temperature: 0.7,
          max_tokens: 256,
          response_format: { type: "json_object" },
        }),
      });

      const data = await response.json();
      console.log(data);
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error("JSON LLM Error:", error);
      throw error;
    }
  }
}

export default LLM;

// Function call Usage example
// const functionDescriptions = [
//     {
//         key: "searchProducts",
//         description: "Search for products in the catalog",
//         parameters: {
//             query: {
//                 type: "string",
//                 description: "Search query"
//             },
//             maxPrice: {
//                 type: "number",
//                 description: "Maximum price filter"
//             },
//             inStock: {
//                 type: "boolean",
//                 description: "Filter for in-stock items only"
//             }
//         }
//     }
// ];

// const result = await llm.getFunctionKey(functionDescriptions, "Find red shoes in footwear");
