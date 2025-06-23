import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Preferences = {
  country: string;
  continent: string;
  destination: string;
};

type ChatStore = {
  history: Message[];
  preferences?: Preferences;
  addMessage: (msg: Message) => void;
  updateLastMessage: (msg: Partial<Message>) => void;
  setPreferences: (prefs: Preferences) => void;
  reset: () => void;
};

type ChatStorePersist = PersistOptions<ChatStore>;

export const useChatStore = create<ChatStore>()(
  persist<ChatStore, [], [], ChatStorePersist>(
    (set) => ({
      history: [],
      preferences: undefined,
      addMessage: (msg) =>
        set((state) => ({
          history: [...state.history, msg],
        })),
      updateLastMessage: (msg: Partial<Message>) =>
        set((state) => {
          const history = [...state.history];
          const lastIndex = history.length - 1;
          if (lastIndex >= 0) {
            history[lastIndex] = { ...history[lastIndex], ...msg };
          }
          return { history };
        }),
      setPreferences: (prefs) => set({ preferences: prefs }),
      reset: () => set({ history: [], preferences: undefined }),
    }),
    {
      name: "chat-store",
    }
  )
);
