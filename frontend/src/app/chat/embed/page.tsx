"use client";
import Chat from '../page';
import { ChatProvider } from '@/context/ChatContext';

export default function EmbedChat() {
  return (
    <ChatProvider>
      <div className="h-screen bg-transparent p-0 overflow-hidden">
        <Chat />
      </div>
    </ChatProvider>
  );
}
