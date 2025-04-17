'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Textarea } from '@/registry/new-york-v4/ui/textarea';
import { Card } from '@/registry/new-york-v4/ui/card';
import { SendIcon, BookOpen, RefreshCw, Zap, Sparkles, AlertCircle, Key, Loader2, XIcon, MenuIcon, CopyIcon, Check, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Progress } from '@/registry/new-york-v4/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '@/registry/new-york-v4/ui/sheet';
import { Separator } from '@/registry/new-york-v4/ui/separator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip";
import { useToast } from '@/registry/new-york-v4/ui/use-toast';
import { 
  getUserChatSessions, 
  createChatSession, 
  updateChatSessionTitle, 
  deleteChatSession,
  saveChatMessage,
  getChatSessionMessages,
  batchSaveChatMessages,
  ChatSession as FirebaseChatSession,
  ChatMessage as FirebaseChatMessage
} from '@/lib/firebase-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/new-york-v4/ui/dialog";
import { Input } from '@/registry/new-york-v4/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/new-york-v4/ui/alert-dialog";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Message types for the chat interface
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt?: Date;
  toolInvocations?: any[]; // Add toolInvocations for AI SDK compatibility
}

interface Source {
  title: string;
  url: string;
  contentType: 'video' | 'blog';
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
}

interface AiChatMainProps {
  apiKey?: string | null;
  userId?: string;
  hasSubscription?: boolean;
}

export function AiChatMain({ apiKey, userId, hasSubscription }: AiChatMainProps) {
  const { userData } = useAuth();
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [freeQueriesRemaining, setFreeQueriesRemaining] = useState(5);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { toast } = useToast();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hoveredLinkUrl, setHoveredLinkUrl] = useState<string | null>(null);
  const [linkPreviewContent, setLinkPreviewContent] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<ChatSession | null>(null); 
  const [newTitle, setNewTitle] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [localStorageSynced, setLocalStorageSynced] = useState(false);
  
  // Create a real function for loading chat sessions instead of using a ref
  const loadChatSessions = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingHistory(true);
      const sessions = await getUserChatSessions(userId);
      
      setChatSessions(sessions.map(session => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt
      })));
      
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: 'Error loading chat history',
        description: 'There was a problem connecting to the server. Your chat history may not be available.',
        variant: 'destructive'
      });
      setChatSessions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load chat sessions once when the component mounts or userId changes
  useEffect(() => {
    if (userId) {
      loadChatSessions();
    }
  }, [userId, toast]); // Add toast to dependencies

  // Add a new function to update the local chat sessions list
  // This is more efficient than reloading all sessions from Firebase
  const addOrUpdateLocalChatSession = (sessionId: string, title: string, isNew = false) => {
    if (!sessionId) return;
    
    // Update the chat sessions array locally
    setChatSessions(prevSessions => {
      // Find if the session already exists
      const sessionIndex = prevSessions.findIndex(s => s.id === sessionId);
      const now = new Date();
      
      // If it's a new session or not found in the array, add it
      if (isNew || sessionIndex === -1) {
        return [
          {
            id: sessionId,
            title: title,
            updatedAt: now
          },
          ...prevSessions.filter(s => s.id !== sessionId) // Remove any duplicate (shouldn't happen)
        ];
      }
      
      // If the session exists, update it and move it to the top
      const updatedSessions = [...prevSessions];
      updatedSessions.splice(sessionIndex, 1); // Remove the existing session
      
      return [
        {
          id: sessionId,
          title: title,
          updatedAt: now
        },
        ...updatedSessions
      ];
    });
  };
  
  // Initialize the chat using AI SDK's useChat hook
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading, 
    error, 
    reload,
    setMessages,
    append
  } = useChat({
    api: '/api/ai-chat',
    headers: {
      'x-api-key': apiKey || '',
      'x-user-id': userId || '',
    },
    id: currentSessionId || undefined,
    maxSteps: 3, // Enable multi-step tool calls for better UX
    onResponse: (response) => {
      // If the response is successful and we have a current session ID, update the session in Firebase
      if (response.ok && currentSessionId && userId) {
        // Update the updatedAt timestamp for the chat session to keep it current
        try {
          const sessionRef = doc(db, 'chat_history', currentSessionId);
          updateDoc(sessionRef, {
            updatedAt: new Date()
          }).then(() => {
            // Find the session title from current sessions
            const sessionTitle = chatSessions.find(s => s.id === currentSessionId)?.title || '';
            // Update locally instead of reloading from Firebase
            addOrUpdateLocalChatSession(currentSessionId, sessionTitle);
          }).catch(error => {
            console.error('Error updating chat session timestamp:', error);
          });
        } catch (error) {
          console.error('Error updating chat session timestamp:', error);
        }
      }
    },
    onFinish: async (message) => {
      // When the AI finishes a response, save the AI message to Firebase
      if (currentSessionId && userId) {
        try {
          await saveChatMessage(
            currentSessionId,
            message.content,
            'assistant'
          );
          
          // Find the session title from current sessions
          const sessionTitle = chatSessions.find(s => s.id === currentSessionId)?.title || '';
          // Update the local chat sessions list instead of reloading from Firebase
          addOrUpdateLocalChatSession(currentSessionId, sessionTitle);
        } catch (error) {
          console.error('Error saving AI message to Firebase:', error);
        }
      } else if (!currentSessionId && userId && messages.length > 0) {
        // Create a new session when the first message exchange is completed
        try {
          setIsCreatingNewSession(true);
          
          // Find the first user message to use as session title
          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            // Create title from the first user message (first 30 chars or first sentence)
            const titleFromMessage = firstUserMessage.content.split('.')[0].trim();
            const title = titleFromMessage.length > 30 
              ? titleFromMessage.substring(0, 27) + '...' 
              : titleFromMessage;
            
            // Create a new session in Firebase
            const newSessionId = await createChatSession(
              userId,
              title,
              firstUserMessage.content
            );
            
            // Now batch save all existing messages
            const messagesToSave = messages.map(m => ({
              content: m.content,
              role: m.role as 'user' | 'assistant'
            }));
            
            await batchSaveChatMessages(newSessionId, messagesToSave);
            
            // Update state with the new session
            setCurrentSessionId(newSessionId);
            
            // Add the new session to the local chat sessions list
            addOrUpdateLocalChatSession(newSessionId, title, true);
          }
        } catch (error) {
          console.error('Error creating new chat session:', error);
          toast({
            title: 'Error saving chat',
            description: 'Failed to save chat history to the server.',
            variant: 'destructive'
          });
        } finally {
          setIsCreatingNewSession(false);
        }
      }
    }
  });
  
  // Custom submit handler to save user messages to Firebase
  const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
    // If there's no current session and the user is logged in,
    // create a new session first
    if (!currentSessionId && userId) {
      try {
        // We'll create the session after the AI responds in the onFinish handler
        // to avoid creating empty sessions
        handleSubmit(e);
      } catch (error) {
        console.error('Error in chat submission:', error);
        toast({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive'
        });
      }
    } else if (currentSessionId && userId) {
      // If there's an existing session, save the message to it
      try {
        // First get the message content before it's cleared by handleSubmit
        const messageContent = input.trim();
        
        // Let the normal chat submission happen
        handleSubmit(e);
        
        // Save the user message to Firebase
        await saveChatMessage(
          currentSessionId,
          messageContent,
          'user'
        );
        
        // Also update the chat session's updatedAt timestamp
        try {
          const sessionRef = doc(db, 'chat_history', currentSessionId);
          await updateDoc(sessionRef, {
            updatedAt: new Date(),
            // Update the lastMessageContent with the user's message
            lastMessageContent: messageContent,
            lastMessageAt: new Date()
          });
          
          // Find the session title from current sessions
          const sessionTitle = chatSessions.find(s => s.id === currentSessionId)?.title || '';
          // Update the local chat sessions list instead of reloading from Firebase
          addOrUpdateLocalChatSession(currentSessionId, sessionTitle);
        } catch (updateError) {
          console.error('Error updating chat session timestamp:', updateError);
        }
      } catch (error) {
        console.error('Error saving message to Firebase:', error);
      }
    } else {
      // Handle standard submission when not using Firebase
      handleSubmit(e);
    }
  };
  
  // Load free queries remaining from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load chat history from localStorage (in a real app, this would come from the backend)
      const savedSessions = localStorage.getItem('chat_sessions');
      if (savedSessions && !userId) {
        setChatSessions(JSON.parse(savedSessions));
      }
      
      // Load remaining free queries
      if (!hasSubscription && !apiKey) {
        const remainingQueries = localStorage.getItem('free_ai_queries_remaining');
        if (remainingQueries) {
          setFreeQueriesRemaining(parseInt(remainingQueries));
        }
      }
    }
  }, [hasSubscription, apiKey, userId]);
  
  // Handle loading messages for a selected chat session
  const handleLoadSession = async (sessionId: string) => {
    if (!userId) {
      setCurrentSessionId(sessionId);
      setMessages([]);
      setIsMobileDrawerOpen(false);
      return;
    }
    
    try {
      setCurrentSessionId(sessionId);
      setIsLoadingMessages(true);
      
      // Fetch messages for this session from Firebase
      const chatMessages = await getChatSessionMessages(sessionId, userId);
      
      // Convert Firebase messages to the format expected by useChat
      const formattedMessages = chatMessages.map(message => ({
        id: message.id,
        content: message.content,
        role: message.role,
        createdAt: message.createdAt
      }));
      
      // Update the chat state with these messages
      setMessages(formattedMessages);
      
      // Check if we got any messages and show a notification if the session is empty
      if (chatMessages.length === 0) {
        // Find the session title to include in the message
        const sessionTitle = chatSessions.find(s => s.id === sessionId)?.title || 'this conversation';
        console.log(`No messages found for "${sessionTitle}". The session might be empty or messages may have been deleted.`);
      }
      
      setIsMobileDrawerOpen(false);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      toast({
        title: 'Error loading messages',
        description: 'Could not retrieve the conversation messages. Please try again or start a new chat.',
        variant: 'destructive'
      });
      // Set empty messages to avoid breaking the UI
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Create a new chat session
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setIsMobileDrawerOpen(false);
  };
  
  // Handle renaming a chat session
  const handleRenameSession = async () => {
    if (!sessionToRename || !userId || !newTitle.trim()) return;
    
    try {
      await updateChatSessionTitle(sessionToRename.id, newTitle.trim());
      
      // Update the local chat sessions list instead of reloading from Firebase
      addOrUpdateLocalChatSession(sessionToRename.id, newTitle.trim());
      
      toast({
        title: 'Chat renamed',
        description: 'Your chat has been successfully renamed.'
      });
    } catch (error) {
      console.error('Error renaming chat session:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename chat. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSessionToRename(null);
      setNewTitle('');
    }
  };
  
  // Handle deleting a chat session
  const handleDeleteSession = async () => {
    if (!sessionToDelete || !userId) return;
    
    try {
      await deleteChatSession(sessionToDelete, userId);
      
      // Update the local chat sessions list instead of reloading from Firebase
      setChatSessions(prevSessions => prevSessions.filter(session => session.id !== sessionToDelete));
      
      // If the deleted session was the current one, create a new chat
      if (currentSessionId === sessionToDelete) {
        handleNewChat();
      }
      
      toast({
        title: 'Chat deleted',
        description: 'Your chat has been successfully deleted.'
      });
    } catch (error) {
      console.error('Error deleting chat session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete chat. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSessionToDelete(null);
    }
  };
  
  // Update free queries when user sends a message
  useEffect(() => {
    // Show upgrade prompt after 3 messages
    if (messages.length >= 6 && !hasSubscription && !showUpgradePrompt) {
      setShowUpgradePrompt(true);
    }
    
    // Track message usage for free tier users
    if (messages.length > 0 && messages[messages.length - 1].role === 'user' && !hasSubscription && !apiKey) {
      // Decrement free queries remaining
      const newCount = Math.max(0, freeQueriesRemaining - 1);
      setFreeQueriesRemaining(newCount);
      localStorage.setItem('free_ai_queries_remaining', newCount.toString());
    }
    
    // Scroll to bottom when new messages arrive
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, hasSubscription, apiKey, freeQueriesRemaining, showUpgradePrompt]);

  // Auto-scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Change the suggestions to be more specific and helpful
  const SUGGESTED_QUESTIONS = [
    "What's the best way to validate a business idea?",
    "How do I create an effective customer acquisition strategy?",
    "What tools should I use to create a minimum viable product?",
    "How can I find investors for my startup?",
    "What's the difference between bootstrapping and raising venture capital?"
  ];

  // Render empty state messaging
  const renderEmptyState = () => (
    <div className="text-center py-12">
      <Sparkles className="h-12 w-12 mb-4 mx-auto text-muted-foreground/30" />
      <h2 className="text-xl font-semibold mb-2">Your AI Research Assistant</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        Ask me anything about entrepreneurship, startup strategies, or our content library. I'll provide relevant answers and resources.
      </p>
      <div className="mt-6 grid gap-3 max-w-md mx-auto">
        {SUGGESTED_QUESTIONS.map((suggestion, i) => (
          <Button
            key={i}
            variant="outline"
            className="justify-start h-auto py-3 px-4 text-left hover:border-primary hover:text-primary"
            onClick={() => {
              if (textAreaRef.current) {
                textAreaRef.current.value = suggestion;
                const event = new Event('input', { bubbles: true });
                textAreaRef.current.dispatchEvent(event);
                handleInputChange({ 
                  target: { value: suggestion } 
                } as React.ChangeEvent<HTMLTextAreaElement>);
              }
            }}
          >
            <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{suggestion}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  // Function to handle copying message content
  const handleCopyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(messageId);
      toast({
        title: 'Copied to clipboard',
        description: 'Message content has been copied to your clipboard.',
      });
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  // Function to format message content with ReactMarkdown
  const formatMessageContent = (content: string, role: 'user' | 'assistant') => {
    if (role === 'user') {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }
    
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => {
              return (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a 
                        {...props} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 inline-flex items-center"
                        onMouseEnter={() => setHoveredLinkUrl(props.href || null)}
                        onMouseLeave={() => setHoveredLinkUrl(null)}
                      >
                        {props.children}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      {props.href}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            },
            code: ({ node, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && (children?.toString()?.split('\n').length === 1);
              
              if (isInline) {
                return (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              }
              
              return (
                <div className="relative my-2 rounded-md bg-muted/50 p-0">
                  <div className="overflow-x-auto p-4">
                    <code className="text-sm" {...props}>
                      {children}
                    </code>
                  </div>
                </div>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // Function to format error messages for better display
  const formatErrorMessage = (error: Error) => {
    const message = error.message;
    
    if (message.includes('API key')) {
      return "Invalid or missing API key. Please check your API key in your profile settings.";
    }
    
    if (message.includes('401')) {
      return "Authentication error. Your API key may have expired or been revoked.";
    }
    
    if (message.includes('429')) {
      return "You've reached the rate limit for AI requests. Please wait a moment before trying again.";
    }
    
    if (message.includes('500')) {
      return "Server error. Our AI service is experiencing issues. Please try again later.";
    }
    
    return message || "An error occurred. Please try again.";
  };

  // Adjust textarea height as user types
  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    
    // Reset height to auto to get the correct scrollHeight
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      // Set new height based on scrollHeight up to max 200px
      const newHeight = Math.min(textAreaRef.current.scrollHeight, 200);
      textAreaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Detect when user is using IME composition (for languages like Japanese, Chinese)
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  // Handle form submission with Enter key (but not when shift is pressed)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      // Prevent sending if no free queries and not premium
      if (freeQueriesRemaining <= 0 && !hasSubscription && !apiKey) {
        setShowUpgradePrompt(true);
        return;
      }
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  // Render a chat session item with rename/delete options
  const renderChatSessionItem = (session: ChatSession) => {
    return (
      <div
        key={session.id}
        className={cn(
          "group flex items-center justify-between pr-2 rounded-md",
          currentSessionId === session.id ? "bg-secondary" : "hover:bg-muted"
        )}
      >
        <Button
          variant={currentSessionId === session.id ? "secondary" : "ghost"}
          className="w-full justify-start text-sm h-auto py-2 px-3 font-normal overflow-hidden"
          onClick={() => handleLoadSession(session.id)}
        >
          <div className="truncate text-left">
            <span>{session.title}</span>
          </div>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <span className="sr-only">More options</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => {
                setSessionToRename(session);
                setNewTitle(session.title);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => setSessionToDelete(session.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // Render the free query usage section
  const renderUsageSection = () => {
    if (hasSubscription) {
      return (
        <div className="flex items-center gap-2 text-xs text-primary">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary gap-1 py-0">
            <Sparkles className="h-3 w-3" />
            <span>Premium</span>
          </Badge>
          <span>Unlimited access</span>
        </div>
      );
    }
    
    if (apiKey) {
      return (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1 py-0">
            <Key className="h-3 w-3" />
            <span>API Key</span>
          </Badge>
        </div>
      );
    }
    
    // Free tier usage indicator
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Free queries remaining:</span>
          <span className={freeQueriesRemaining <= 1 ? "text-destructive font-medium" : ""}>
            {freeQueriesRemaining} / 5
          </span>
        </div>
        <Progress value={freeQueriesRemaining * 20} className="h-1" />
      </div>
    );
  };

  // Modify the renderEmptyState function to handle role type properly
  const renderMessageItem = (message: Message) => (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative max-w-full",
        message.role === 'user' ? "items-end" : "items-start"
      )}
    >
      <div className={cn(
        "px-4 py-3 rounded-lg relative w-full max-w-full break-words",
        message.role === 'user' 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-white dark:bg-white/5 text-foreground"
      )}>
        {/* Add copy button for assistant messages */}
        {message.role === 'assistant' && message.content && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full"
              onClick={() => handleCopyMessage(message.id, message.content)}
            >
              {copiedMessageId === message.id ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="sr-only">Copy message</span>
            </Button>
          </div>
        )}
        
        {message.role === 'assistant' ? (
          <>
            {message.content ? (
              formatMessageContent(message.content, message.role)
            ) : message.toolInvocations && message.toolInvocations.length > 0 ? (
              <span className="italic font-light text-muted-foreground">
                Searching knowledge base for relevant information...
              </span>
            ) : null}
          </>
        ) : (
          formatMessageContent(message.content, message.role)
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Chat History Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden md:flex w-64 border-r flex-col h-full">
        <div className="p-4 flex justify-between items-center">
          <h2 className="font-semibold">Conversation History</h2>
          <Button variant="ghost" size="sm" onClick={handleNewChat}>
            <span className="text-xs">New Chat</span>
          </Button>
        </div>
        <Separator />
        <div className="flex-1 overflow-auto p-2">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Your conversation history will appear here
            </div>
          ) : (
            <div className="space-y-1">
              {chatSessions.map(session => renderChatSessionItem(session))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header with drawer trigger */}
        <div className="md:hidden flex items-center justify-between p-3 border-b sticky top-0 z-10 bg-background">
          <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MenuIcon className="h-5 w-5" />
                <span className="sr-only">Open conversation history</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 flex justify-between items-center">
                  <h2 className="font-semibold">Conversation History</h2>
                  <Button variant="ghost" size="sm" onClick={handleNewChat}>
                    <span className="text-xs">New Chat</span>
                  </Button>
                </div>
                <Separator />
                <div className="flex-1 overflow-auto p-2">
                  {isLoadingHistory ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Your conversation history will appear here
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {chatSessions.map(session => renderChatSessionItem(session))}
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1 text-center">
            <h2 className="font-semibold text-sm">
              {currentSessionId ? 
                chatSessions.find(s => s.id === currentSessionId)?.title || 'AI Research Assistant' : 
                'AI Research Assistant'
              }
            </h2>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewChat}>
            <span className="sr-only">Start a new conversation</span>
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>

        {/* Chat Messages Container - This is the only area that should scroll */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 md:py-8 md:px-6"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Display loading indicator when loading messages */}
          {isLoadingMessages && (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Loading conversation...</p>
              </div>
            </div>
          )}
          
          {/* Display upgrade prompt for free users */}
          {!isLoadingMessages && showUpgradePrompt && !hasSubscription && !apiKey && (
            <div className="mb-6 p-4 border border-primary/20 bg-primary/5 rounded-lg flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-start gap-3 mb-4 sm:mb-0">
                <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium">Upgrade to Premium for Unlimited AI Research</h3>
                  <p className="text-sm text-muted-foreground">You have {freeQueriesRemaining} free queries remaining. Get unlimited access to our full knowledge base with a premium subscription.</p>
                </div>
              </div>
              <Button 
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => router.push('/subscribe')}
              >
                <Zap className="mr-2 h-4 w-4" />
                Upgrade Now
              </Button>
            </div>
          )}
          
          {/* Messages */}
          {!isLoadingMessages && (
            <div className="max-w-3xl mx-auto space-y-4 mb-6">
              {messages.length === 0 ? (
                renderEmptyState()
              ) : (
                messages.map((message) => {
                  // Make sure we handle only user and assistant messages
                  const safeRole = message.role === 'user' || message.role === 'assistant' 
                    ? message.role 
                    : 'assistant';
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "group relative max-w-full",
                        safeRole === 'user' ? "items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-3 rounded-lg relative w-full max-w-full break-words",
                        safeRole === 'user' 
                          ? "bg-primary text-primary-foreground ml-auto" 
                          : "bg-white dark:bg-white/5 text-foreground"
                      )}>
                        {/* Add copy button for assistant messages */}
                        {safeRole === 'assistant' && message.content && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 rounded-full"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <CopyIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className="sr-only">Copy message</span>
                            </Button>
                          </div>
                        )}
                        
                        {safeRole === 'assistant' ? (
                          <>
                            {message.content ? (
                              formatMessageContent(message.content, safeRole)
                            ) : message.toolInvocations && message.toolInvocations.length > 0 ? (
                              <span className="italic font-light text-muted-foreground">
                                Searching knowledge base for relevant information...
                              </span>
                            ) : null}
                          </>
                        ) : (
                          formatMessageContent(message.content, safeRole)
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              {(isLoading || isCreatingNewSession) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="px-4 py-3 rounded-lg bg-muted/30 flex items-center">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce"></div>
                    </div>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {isCreatingNewSession ? 'Saving conversation...' : 'Researching your question...'}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
        
        {/* Message Input Area - Should remain fixed at the bottom */}
        <div className="border-t p-4 md:px-8 md:py-4 bg-background relative z-10">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <span>{formatErrorMessage(error)}</span>
                <div className="mt-2 sm:mt-0 flex gap-2">
                  {(error.message.includes('API key') || error.message.includes('401')) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = '/profile'}
                      className="h-7 px-2"
                    >
                      Update API Key
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => reload()}
                    className="h-7 px-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Show warning if low on free queries */}
            {!hasSubscription && !apiKey && freeQueriesRemaining <= 1 && (
              <div className="text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 p-3 rounded mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>{freeQueriesRemaining === 0 ? "You've used all free queries" : "Almost out of free queries!"}</strong> {freeQueriesRemaining === 0 ? "Upgrade to continue researching." : "Only 1 query remaining."}{" "}
                  <Button variant="link" className="h-auto p-0 text-amber-700 dark:text-amber-400 font-medium underline" onClick={() => router.push('/subscribe')}>
                    Upgrade to Premium
                  </Button>{" "}
                  for unlimited access to AI research.
                </span>
              </div>
            )}
            
            {/* Message input form */}
            <form onSubmit={handleChatSubmit} className="relative">
              <Textarea
                ref={textAreaRef}
                value={input}
                onChange={handleTextAreaChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder={freeQueriesRemaining === 0 && !hasSubscription && !apiKey 
                  ? "You've used all your free queries. Upgrade to continue researching."
                  : "Ask any question about entrepreneurship, startups, or our content library..."}
                className="min-h-[60px] w-full resize-none rounded-lg border border-input bg-background p-3 pr-12"
                disabled={isLoading || isCreatingNewSession || isLoadingMessages || (freeQueriesRemaining === 0 && !hasSubscription && !apiKey)}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || isCreatingNewSession || isLoadingMessages || input.trim() === '' || (freeQueriesRemaining === 0 && !hasSubscription && !apiKey)}
                className={`absolute bottom-3 right-3 h-8 w-8 ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading || isCreatingNewSession ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
                <span className="sr-only">Send message</span>
              </Button>
            </form>
            
            {/* Chat usage indicator */}
            <div className="mt-3">
              {renderUsageSection()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Rename Dialog */}
      <Dialog open={sessionToRename !== null} onOpenChange={(open) => !open && setSessionToRename(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter a new title"
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSessionToRename(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRenameSession}
              disabled={!newTitle.trim() || newTitle === sessionToRename?.title}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={sessionToDelete !== null} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 