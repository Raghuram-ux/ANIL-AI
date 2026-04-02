"use client";
import dynamic from 'next/dynamic';
import { ChatProvider } from '@/context/ChatContext';

const Chat = dynamic(() => import('../page'), { ssr: false });

export default function EmbedChat() {
  return (
    <ChatProvider>
      <div className="h-screen bg-transparent p-0 overflow-hidden">
        <Chat />
      </div>
    </ChatProvider>
  );
}
