"use client";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useChatStore } from "./stores/chat-store";

export default function ChatPage() {
  const {
    history,
    preferences,
    addMessage,
    updateLastMessage,
    setPreferences,
    reset,
  } = useChatStore();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const fetchBotResponse = useCallback(
    async (prompt: string) => {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history }),
      });

      const { reply, preferences } = await res.json();

      if (preferences && Object.keys(preferences).length > 0) {
        setPreferences(preferences);
      }

      let displayedText = "";
      addMessage({ role: "assistant", content: "" });

      for (let i = 0; i < reply.length; i++) {
        displayedText += reply[i];
        updateLastMessage({ content: displayedText });
        await new Promise((r) => setTimeout(r, 20));
      }
    },
    [history, addMessage, updateLastMessage, setPreferences]
  );

  const send = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");
    addMessage({ role: "user", content: userText });
    await fetchBotResponse(userText);
  };

  const subtitle = useMemo(() => {
    return preferences
      ? `Your favorites: ${preferences.country} · ${preferences.continent} · ${preferences.destination}`
      : "Your preferences will be saved as we chat ✨";
  }, [preferences]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-full max-w-md mx-auto my-20 flex flex-col bg-white dark:bg-gray-900 shadow-xl rounded-xl border dark:border-gray-700">
        <div className="bg-gray-800 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold">🌍 Your geography helper!</h1>
            <p className="text-xs text-gray-300">{subtitle}</p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-[35rem] overflow-y-auto p-3 space-y-2 text-sm">
            {history.length === 0 && (
              <div className="text-center text-sm text-gray-400 mt-10">
                <p>👋 Hello! Ready to explore the world?</p>
                <p className="mt-1">Not all those who wander are lost 🌍</p>
              </div>
            )}
            {history.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[80%] break-words shadow-md ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white rounded-bl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && send()}
            className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
            placeholder="Type a message"
          />
          <button
            onClick={send}
            disabled={input.trim().length === 0}
            className={`px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 transition ${
              input.trim().length === 0 ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
