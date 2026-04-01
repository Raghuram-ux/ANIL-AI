"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Message {
  role: string;
  content: string;
  sources?: string[];
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Laxx Online. Ready for your queries regarding attendance, syllabus, and university policies.' }
  ]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error("Failed to load session chat history", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when messages change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('chat_messages', JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'Laxx Online. Ready for your queries regarding attendance, syllabus, and university policies.' }]);
    localStorage.removeItem('chat_messages');
  };

  return (
    <ChatContext.Provider value={{ messages, setMessages, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
