import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, FileText, Users, Clock } from 'lucide-react';

interface Message {
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

interface FAQ {
  keywords: string[];
  response: string;
  category: string;
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  query: string;
}

const FAQBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      text:
        "Hi! I'm your Learning & Policy Assistant. Ask me about company policies, training programs, onboarding, or HR guidelines.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sample FAQ Knowledge Base
  const faqDatabase: Record<string, FAQ> = {
    onboarding: {
      keywords: ['onboarding', 'new hire', 'first day', 'orientation', 'start date'],
      response:
        "Our onboarding process includes:\n\n1. Pre-boarding: You'll receive welcome emails and paperwork 1 week before start\n2. Day 1: IT setup, office tour, meet your team\n3. Week 1: Complete compliance training modules\n4. First Month: Regular check-ins with your manager and buddy\n\nYou can access the full onboarding guide in the Learning Portal.",
      category: 'Onboarding',
    },
    pto: {
      keywords: ['pto', 'vacation', 'time off', 'leave', 'holiday', 'sick'],
      response:
        'PTO Policy Overview:\n\n• Annual Leave: 20 days per year\n• Sick Leave: 10 days per year\n• Public Holidays: 12 days (company observes major holidays)\n• Request Process: Submit through HR portal at least 2 weeks in advance\n• Approval: Manager approval required\n\nFor extended leave or special circumstances, please contact HR directly.',
      category: 'HR Policy',
    },
    training: {
      keywords: ['training', 'learning', 'course', 'development', 'certification', 'upskill'],
      response:
        'Learning & Development Programs:\n\n📚 Available Resources:\n• LinkedIn Learning: Full access for all employees\n• Internal Academy: Role-specific courses\n• Mentorship Program: Quarterly matching\n• Conference Budget: $2,000 annually per employee\n\n💡 Popular Courses:\n- Leadership Essentials\n- Technical Skills Bootcamp\n- Communication Mastery\n- Project Management Certification',
      category: 'Learning',
    },
    remote: {
      keywords: ['remote', 'work from home', 'wfh', 'hybrid', 'flexible'],
      response:
        'Remote Work Policy:\n\n🏠 Hybrid Schedule:\n• In-office: Tuesday, Wednesday, Thursday\n• Remote: Monday, Friday (flexible)\n• Core Hours: 10 AM - 3 PM (your timezone)\n\n📋 Requirements:\n• Home office setup stipend: $500\n• Maintain video-on culture for meetings\n• Respond to messages within 2 hours during work hours\n• Weekly team sync mandatory',
      category: 'HR Policy',
    },
    performance: {
      keywords: ['performance', 'review', 'evaluation', 'feedback', 'appraisal', 'promotion'],
      response:
        "Performance Review Process:\n\n📊 Review Cycle:\n• Quarterly Check-ins: Informal progress discussions\n• Mid-Year Review: Goal progress assessment (June)\n• Annual Review: Comprehensive evaluation (December)\n\n🎯 What's Evaluated:\n- Goal achievement\n- Core competencies\n- Leadership behaviors\n- Peer feedback (360-degree)\n\n💰 Promotion Cycle: Annual in January based on December reviews",
      category: 'HR Policy',
    },
    benefits: {
      keywords: ['benefits', 'insurance', 'health', 'dental', '401k', 'retirement', 'pension'],
      response:
        'Employee Benefits Package:\n\n🏥 Health & Wellness:\n• Medical, Dental, Vision insurance\n• Mental health support (10 therapy sessions/year)\n• Gym membership reimbursement: $50/month\n\n💰 Financial:\n• 401(k) with 5% company match\n• Annual bonus: Up to 15% of salary\n• Stock options (for eligible roles)\n\n🌟 Other Perks:\n• Commuter benefits\n• Free lunch on office days\n• Learning budget: $2,000/year',
      category: 'HR Policy',
    },
    compliance: {
      keywords: ['compliance', 'ethics', 'code of conduct', 'harassment', 'discrimination'],
      response:
        'Compliance & Ethics:\n\n⚖️ Required Training:\n• Code of Conduct (Annual)\n• Anti-Harassment (Annual)\n• Data Privacy & Security (Quarterly)\n• Industry-specific compliance (Role-based)\n\n📢 Reporting:\n• Ethics Hotline: 1-800-XXX-XXXX\n• Anonymous reporting available\n• Non-retaliation policy strictly enforced\n\nAll compliance training must be completed within 30 days of assignment.',
      category: 'Compliance',
    },
  };

  const quickActions: QuickAction[] = [
    { icon: BookOpen, label: 'Onboarding Guide', query: 'Tell me about onboarding' },
    { icon: FileText, label: 'Compliance & Ethics', query: 'What compliance training do I need?' },
    { icon: Users, label: 'Training Programs', query: 'What training is available?' },
    { icon: Clock, label: 'Remote Work', query: 'What is the remote work policy?' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findBestMatch = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    for (const [, faq] of Object.entries(faqDatabase)) {
      if (faq.keywords.some((keyword) => lowerInput.includes(keyword))) {
        return faq.response;
      }
    }
    return (
      "I'm not sure about that specific question. Here are some topics I can help with:\n\n" +
      '• Onboarding process\n' +
      '• PTO and leave policies\n' +
      '• Training and development programs\n' +
      '• Remote work guidelines\n' +
      '• Performance reviews\n' +
      '• Benefits and compensation\n' +
      '• Compliance training\n\n' +
      'Try asking about any of these topics, or rephrase your question!'
    );
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { type: 'user', text: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = findBestMatch(userMessage.text);
      const botMessage: Message = { type: 'bot', text: botResponse, timestamp: new Date() };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleQuickAction = (query: string) => {
    const userMessage: Message = { type: 'user', text: query, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = findBestMatch(query);
      const botMessage: Message = { type: 'bot', text: botResponse, timestamp: new Date() };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    // ⬇️ Constrained height; internal scroll handled below
    <div className="flex flex-col h-[70vh] md:h-[72vh]">
      {/* Header */}
      <div className="bg-white shadow-md px-6 py-4 border-b-2 border-indigo-500">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Learning & Policy Assistant</h1>
            <p className="text-sm text-gray-600">Your 24/7 HR and Learning Support</p>
          </div>
        </div>
      </div>

      {/* Scrollable area (messages + sticky quick topics) */}
      <div className="flex-1 overflow-y-auto">
        {/* Sticky Quick Topics — always visible */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
          <div className="px-6 pt-3 pb-3">
            <p className="text-sm text-gray-600 mb-2 font-medium">Quick Topics:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.query)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm text-indigo-700 border border-indigo-200 transition-colors"
                  >
                    <Icon size={16} />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="px-6 py-4 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'bot' ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
              >
                {message.type === 'bot' ? (
                  <Bot size={18} className="text-white" />
                ) : (
                  <User size={18} className="text-white" />
                )}
              </div>

              <div className={`max-w-[85%] ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block px-4 py-3 rounded-2xl ${
                    message.type === 'bot'
                      ? 'bg-white shadow-md border border-gray-200 text-gray-800'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed">{message.text}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 px-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="bg-white shadow-md border border-gray-200 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t shadow-lg px-6 py-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about policies, training, onboarding..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <Send size={18} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          This is a demo bot. Responses are pre-programmed. Ready to connect to real AI!
        </p>
      </div>
    </div>
  );
};

export default FAQBot;
