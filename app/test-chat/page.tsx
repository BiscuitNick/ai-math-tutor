"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import type { Message } from "@/components/chat/MessageBubble";

export default function TestChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "tutor",
      content: "Hello! I'm your math tutor. What problem would you like to work on today?",
      timestamp: new Date(Date.now() - 60000)
    },
    {
      id: "2",
      role: "student",
      content: "I need help solving this equation: 2x + 5 = 13",
      timestamp: new Date(Date.now() - 30000)
    },
    {
      id: "3",
      role: "tutor",
      content: "Great! Let's work through this step by step. What do you think we should do first to isolate x?",
      timestamp: new Date(Date.now() - 15000)
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (data: { text: string; images: File[] }) => {
    // Add student message
    const studentMessage: Message = {
      id: Date.now().toString(),
      role: "student",
      content: data.text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, studentMessage]);

    // Simulate AI response
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const tutorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "tutor",
      content: "That's a great observation! Can you explain your reasoning?",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, tutorMessage]);
    setIsLoading(false);
  };

  return (
    <div className="h-screen w-full">
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
