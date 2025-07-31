import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { ChatMessage } from "@shared/schema";

interface ChatSystemProps {
  currentUser: {
    id: string;
    name: string;
    avatar: string;
  };
}

export default function ChatSystem({ currentUser }: ChatSystemProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: initialMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/chat/messages"],
  });

  const { sendMessage } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'chat_message') {
        setMessages(prev => [...prev, data.data]);
      }
    }
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    sendMessage({
      type: 'chat_message',
      userId: currentUser.id,
      content: message.trim()
    });

    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-elevated">
        <h3 className="text-sm font-semibold flex items-center">
          <MessageCircle className="mr-2 text-primary" size={16} />
          Live Chat
        </h3>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg, index) => (
          <div key={msg.id || index} className="chat-message">
            <div className="flex items-start space-x-2">
              <img 
                src={msg.user?.profileImageUrl || msg.user?.avatar || currentUser.avatar}
                alt="User avatar" 
                className="w-6 h-6 rounded-full object-cover mt-0.5" 
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium">
                    {msg.user?.firstName || msg.user?.name || currentUser.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-200">{msg.message}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input */}
      <div className="p-4 border-t border-elevated">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-elevated border-gray-600 focus:border-primary"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-primary hover:bg-blue-600"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}