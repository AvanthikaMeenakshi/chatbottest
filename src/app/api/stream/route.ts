import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a friendly geography chatbot. When you get the first message, greet the user and start asking them the following questions.

1. What is your favorite country?
2. What is your favorite continent?
3. What is your favorite destination?

Ask one at a time. If the user answers a question without a prompt (e.g. says “India”), assume they are responding to the last question.
Only accept real-world, geography-valid answers. 
If the answer is fictional, imaginary, or not a recognized country/continent/destination, gently correct them and re-ask the same question.
Do not proceed to the next question or finish onboarding until a valid answer is provided.
Users can update their answer anytime. Let users know this after they finish onboarding.

When all 3 are answered, respond to the user with a warm, friendly message like but not limited to: "Thanks! You're all set 🌍 Ask me anything about world geography."

After onboarding:
- Only answer geography-related questions.
- Refer to the user's preferences when relevant.
- Keep a warm, concise tone and use emojis sparingly.

You should:
- Answer questions about world geography, countries, cities, landscapes, and physical geography.
- Reference the user's onboarding preferences when helpful.
- Maintain a friendly and conversational tone.
- Keep responses concise and informative.
- Use emojis sparingly to keep the tone warm and engaging.

Do NOT provide:
1. Code examples or programming help
2. Medical advice or health diagnostics
3. Legal or financial advice
4. Product or brand comparisons
5. Opinions on political conflicts or current events
6. Adult, explicit, or sensitive content
7. Religious or spiritual advice
8. Homework or test answers
9. Travel bookings or visa requirement information
10. Real-time data (e.g., current weather or time)
11. Personal data lookup (e.g., "Where am I?" unless previously provided)

You DO focus on:
- Capital cities, countries, continents, oceans
- Cultures, languages, landmarks, demographics
- Mountains, rivers, deserts, and climate zones
- Travel suggestions based on geography and user preferences
- Interesting facts about places and regions
- Historical geography and ancient civilizations
- Country borders and geopolitical regions
- Ecosystems, biomes, and environmental features
- Time zones and hemispheres
- UNESCO World Heritage Sites
- Geography-linked cultural festivals and traditions
- Non-realtime geology and natural phenomena (e.g., volcanoes, earthquakes)
`;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "storeUserPreferences",
      description: "Stores the user's geography preferences",
      parameters: {
        type: "object",
        properties: {
          country: { type: "string" },
          continent: { type: "string" },
          destination: { type: "string" },
        },
        required: ["country", "continent", "destination"],
      },
    },
  },
];

const CHAT_AGENT_MODEL = "gpt-4.1";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const getChatBotResponse = async ({
  message,
  history,
}: {
  message: string;
  history: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
}) => {
  let reply = "";
  let preferences = {};

  const moderationResponse = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: message,
  });

  // If flagged by the moderator, decline to respond.
  if (moderationResponse.results[0].flagged) {
    return {
      reply:
        "I'm sorry, but I can't respond to that. Let's keep our conversation friendly and respectful 🌍",
    };
  }
  const response = await openai.chat.completions.create({
    model: CHAT_AGENT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ],
    tools,
    stream: false,
  });

  const openAIReponse = response.choices[0].message;
  const toolCall = openAIReponse.tool_calls;
  reply = response.choices[0]?.message?.content || "";

  // Tool calls are used to persist the user's preferences.
  // If a tool call is present, we should simulate the tool's execution (e.g., save to DB or local store),
  // then respond with a `tool` role message so the model can continue the conversation.
  // This is because the response from agent will be null on the content front.
  if (toolCall && toolCall.length > 0) {
    const finalRes = await openai.chat.completions.create({
      model: CHAT_AGENT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message },
        {
          role: "assistant",
          content: null,
          tool_calls: openAIReponse.tool_calls,
        },
        {
          role: "tool",
          tool_call_id: toolCall[0].id,
          content: "Preferences saved successfully",
        },
      ],
      tools,
      stream: false,
    });
    reply = finalRes.choices[0].message?.content || "";
    preferences = JSON.parse(toolCall[0].function.arguments);
  }
  return {
    reply,
    preferences,
  };
};

export async function POST(req: Request) {
  const { message, history = [] } = await req.json();
  const { reply, preferences } = await getChatBotResponse({
    message,
    history,
  });
  return Response.json({ reply, preferences });
}
