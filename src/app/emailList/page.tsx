'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { disconnectSocket, emitMailEvent } from '@/lib/socket'
import { mailCache } from '@/lib/cache'
import { MailFolder, MailMessage, Account, Provider } from '@/lib/types'
import { toast } from 'sonner'
import { LoadingScreen } from '@/components/LoadingScreen'
import { MoreVertical, Star, Sparkles, Trash2, CheckCircle2, BarChart2 } from 'lucide-react'
import { SiGmail} from 'react-icons/si'
import { PiMicrosoftOutlookLogoDuotone } from "react-icons/pi";
import { IoMdAdd, IoMdLogOut } from 'react-icons/io'
import { FaUser } from 'react-icons/fa'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SetupWizard } from '@/components/SetupWizard'
import Link from 'next/link'
import { useSocket } from '@/contexts/SocketContext'
import { ComposeFAB } from '@/components/ComposeFAB'
import { Skeleton } from "@/components/ui/skeleton"
import { Counter } from "@/components/ui/counter";
import { cn } from "@/lib/utils";


// Extend Window interface to include our custom property
declare global {
  interface Window {
    addAccountPollTimer?: NodeJS.Timeout;
  }
}

const ProviderIcon = ({ provider, className }: { provider: Provider, className?: string }) => {
  if (provider === 'outlook') {
    return <PiMicrosoftOutlookLogoDuotone className={className} />
  }
  return <SiGmail className={className} />
}

// Add this component after the ProviderIcon component
const EmailSkeleton = () => (
  <div className="flex items-center space-x-4 p-4 border-b">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
  </div>
);

// Add this component after EmailSkeleton
const EmailListSkeleton = () => (
  <div className="divide-y h-full">
    {Array.from({ length: 10 }).map((_, i) => (
      <EmailSkeleton key={i} />
    ))}
  </div>
);

export default function DashboardPage() {
  const router = useRouter()
  const [linkedAccounts, setLinkedAccounts] = useState<Account[]>([])
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [folders, setFolders] = useState<MailFolder[]>([])
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const currentFolderRef = useRef<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const { socket, isConnected, addEventHandler, removeEventHandler } = useSocket()
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const fetchLinkedAccounts = useCallback(async (setDefault = true) => {
    try {
      const appUserId = localStorage.getItem('appUserId')
      if (!appUserId) {
        router.push('/')
        return
      }

      setIsLoading(true)

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/account/accounts?appUserId=${appUserId}`)
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        const data = await res.json()
        const apiAccounts = data.accounts || []

        setLinkedAccounts(apiAccounts)
        setShowSetupWizard(false) // Reset setup wizard state
        
        if (apiAccounts.length > 0 && setDefault) {
          setActiveAccount(apiAccounts[0])
          localStorage.setItem('activeEmail', apiAccounts[0].email)
        } else if (apiAccounts.length === 0) {
          // Only show setup wizard if explicitly no accounts
          setShowSetupWizard(true)
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
        toast.error('Failed to load accounts')
        // Don't show setup wizard on error, might be temporary
        setShowSetupWizard(false)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to initialize accounts:', error)
      toast.error('Failed to load accounts')
      setIsLoading(false)
    }
  }, [router])

  const initializeFolders = useCallback(async (account: Account) => {
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) return;

    // Check cache first
    const cachedFolders = mailCache.getFolders(account.email);
    if (cachedFolders) {
      console.log('[Debug] Using cached folders:', cachedFolders.length);
      setFolders(cachedFolders);
      
      const inbox = cachedFolders.find(f => f.displayName.toLowerCase() === 'inbox');
      if (inbox && !currentFolderRef.current) {
        setCurrentFolder(inbox.id);
        currentFolderRef.current = inbox.id;
      }
      return;
    }

    // If no cache, fetch folders once using getFolder
    emitMailEvent.getFolder({
      appUserId,
      email: account.email,
      folderId: 'root', // Use root folder to get all folders
      page: 1
    });
  }, []);

  // Effect for socket initialization
  useEffect(() => {
    if (!activeAccount || !socket) {
      console.log('[Debug] Socket initialization skipped:', { 
        hasActiveAccount: !!activeAccount, 
        hasSocket: !!socket 
      });
      return;
    }
  
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) {
      console.log('[Debug] No appUserId found');
      router.push('/');
      return;
    }

    console.log('[Debug] Setting up socket handlers for:', activeAccount.email);

    // Initialize folders only once when account changes
    initializeFolders(activeAccount);

    // Set up message-related event handlers
    const handleNewMessage = (message: MailMessage) => {
      console.log('[Debug] Received mail:new event:', message.id);
      if (message.folder === currentFolder) {
        setMessages(prev => [{ ...message, flagged: false }, ...prev]);
      }
      // Update folder unread count without refreshing entire folder list
      setFolders(prev => prev.map(folder => 
        folder.id === message.folder 
          ? { ...folder, unreadItemCount: folder.unreadItemCount + (message.read ? 0 : 1) }
          : folder
      ));
    };

    const handleSyncComplete = () => {
      console.log('[Debug] Received mail:syncComplete event');
      toast.success('Mailbox sync completed');
    };

    const handleMarkedRead = (messageId: string) => {
      // Update message in current folder if it exists
      if (currentFolder) {
        mailCache.updateMessage(activeAccount.email, currentFolder, messageId, { read: true });
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
      }
      
      // Update folder unread count for the folder containing this message
      setFolders(prev => prev.map(folder => {
        const messageInFolder = messages.find(m => m.id === messageId && m.folder === folder.id);
        if (messageInFolder && folder.unreadItemCount > 0) {
          return { ...folder, unreadItemCount: folder.unreadItemCount - 1 };
        }
        return folder;
      }));
    };

    const handleError = (error: string) => {
      console.error('[Debug] Socket error:', error);
      setIsLoadingMessages(false);
      setIsLoading(false);
      // You might want to show a toast or notification here
    };

    const handleFolderMessages = ({ folderId, messages: newMessages, nextLink, page }: { 
      folderId: string; 
      messages: MailMessage[]; 
      nextLink: string | null; 
      page: number 
    }) => {
      console.log('[Debug] Received folder messages:', { 
        folderId, 
        messageCount: newMessages.length, 
        page,
        currentFolder,
        isCurrentFolder: folderId === currentFolder
      });
      
      // Cache the messages regardless of current folder
      if (activeAccount) {
        mailCache.setMessages(activeAccount.email, folderId, newMessages, nextLink, page);
      }

      // Update state if this is the current folder or if we don't have a current folder yet
      if (folderId === currentFolder || !currentFolder) {
        const messagesWithFlagged = newMessages.map(msg => ({ ...msg, flagged: false }));
        
        if (page === 1) {
          // Replace messages for first page
          setMessages(messagesWithFlagged);
        } else {
          // Append messages for subsequent pages
          setMessages(prev => [...prev, ...messagesWithFlagged]);
        }
        
        setHasMoreMessages(!!nextLink);
        setCurrentPage(page);
        setIsLoadingMessages(false);
        setIsLoadingMore(false);
        setIsLoading(false);
      }
    };

    const handleFolders = (folders: MailFolder[]) => {
      console.log('[Debug] Received mail:folders event:', folders.length);
      mailCache.setFolders(activeAccount.email, folders);
      setFolders(folders);
      setIsLoading(false);

      const inbox = folders.find(f => f.displayName.toLowerCase() === 'inbox');
      if (inbox) {
        console.log('[Debug] Setting current folder to inbox:', inbox.id);
        setCurrentFolder(inbox.id);
        currentFolderRef.current = inbox.id;
        
        // Check cache first for inbox messages
        const cachedMessages = mailCache.getMessages(activeAccount.email, inbox.id);
        if (cachedMessages) {
          console.log('[Debug] Using cached messages for inbox:', cachedMessages.messages.length);
          setMessages(cachedMessages.messages);
          setHasMoreMessages(!!cachedMessages.nextLink);
          setCurrentPage(cachedMessages.page);
          setIsLoading(false);
          setIsLoadingMessages(false);
        } else {
          console.log('[Debug] No cached messages, fetching inbox');
          setIsLoadingMessages(true);
          emitMailEvent.getFolder({
            appUserId,
            email: activeAccount.email,
            folderId: inbox.id,
            page: 1
          });
        }
      }
    };

    const handleImportantMarked = ({ messageId, flag }: { messageId: string; flag: boolean }) => {
      if (currentFolder) {
        mailCache.updateMessage(activeAccount.email, currentFolder, messageId, { important: flag });
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, important: flag } : m));
      }
    };

    // Add event handlers using the context
    addEventHandler('mail:new', handleNewMessage);
    addEventHandler('mail:syncComplete', handleSyncComplete);
    addEventHandler('mail:markedRead', handleMarkedRead);
    addEventHandler('mail:error', handleError);
    addEventHandler('mail:folders', handleFolders);
    addEventHandler('mail:folderMessages', handleFolderMessages);
    addEventHandler('mail:importantMarked', handleImportantMarked);

    // Initialize mail sync if socket is connected
    if (isConnected && activeAccount) {
      console.log('[Debug] Socket connected, initializing mail sync...');
      const appUserId = localStorage.getItem('appUserId');
      if (!appUserId) {
        console.error('[Debug] No appUserId found');
        return;
      }
      socket.emit('mail:init', { appUserId, email: activeAccount.email });
    } else {
      console.log('[Debug] Socket not connected or no active account, waiting...');
    }

    // Add visibility change handler only for messages
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentFolder && activeAccount) {
        // Only refresh messages, not folders
        setIsLoadingMessages(true);
        const appUserId = localStorage.getItem('appUserId');
        if (!appUserId) return;
        
        emitMailEvent.getFolder({
          appUserId,
          email: activeAccount.email,
          folderId: currentFolder,
          page: 1
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeEventHandler('mail:new', handleNewMessage);
      removeEventHandler('mail:syncComplete', handleSyncComplete);
      removeEventHandler('mail:markedRead', handleMarkedRead);
      removeEventHandler('mail:error', handleError);
      removeEventHandler('mail:folders', handleFolders);
      removeEventHandler('mail:folderMessages', handleFolderMessages);
      removeEventHandler('mail:importantMarked', handleImportantMarked);
    };
  }, [activeAccount, socket, isConnected, addEventHandler, removeEventHandler]);

  // Add debug logging for loading state
  useEffect(() => {
    console.log('[Debug] Loading state changed:', { 
      isLoading, 
      hasActiveAccount: !!activeAccount, 
      foldersCount: folders.length,
      messagesCount: messages.length,
      currentFolder
    });
  }, [isLoading, activeAccount, folders.length, messages.length, currentFolder]);

  // Effect for refreshing current folder
  useEffect(() => {
    if (!activeAccount || !currentFolder) return;
    
    // Check cache first
    const cachedMessages = mailCache.getMessages(activeAccount.email, currentFolder);
    if (cachedMessages) {
      console.log('[Debug] Using cached messages for current folder:', currentFolder);
      setMessages(cachedMessages.messages);
      setHasMoreMessages(!!cachedMessages.nextLink);
      setCurrentPage(cachedMessages.page);
      setIsLoadingMessages(false);
    } else {
      console.log('[Debug] No cached messages, fetching current folder:', currentFolder);
      setIsLoadingMessages(true);
      const appUserId = localStorage.getItem('appUserId');
      if (!appUserId) return;
      
      // Add a timeout to reset loading state if no response is received
      const timeoutId = setTimeout(() => {
        console.log('[Debug] Folder messages fetch timeout, resetting loading state');
        setIsLoadingMessages(false);
        setIsLoading(false);
      }, 10000); // 10 second timeout

      emitMailEvent.getFolder({
        appUserId,
        email: activeAccount.email,
        folderId: currentFolder,
        page: 1
      });

      return () => clearTimeout(timeoutId);
    }
  }, [activeAccount, currentFolder]);

  // Effect for fetching linked accounts
  useEffect(() => {
    fetchLinkedAccounts();
  }, [fetchLinkedAccounts]);

  // Effect for setting active email in localStorage
  useEffect(() => {
    if (activeAccount) {
      localStorage.setItem('activeEmail', activeAccount.email);
    }
  }, [activeAccount]);

  // Effect for initial user email setup
  useEffect(() => {
    const email = localStorage.getItem('userEmail')
    if (email) {
      setUserEmail(email)
    }
    fetchLinkedAccounts()
  }, [])

  const handleFolderClick = (folderId: string) => {
    if (folderId === currentFolder) return;
    
    setCurrentFolder(folderId);
    currentFolderRef.current = folderId;
    setMessages([]); // Clear existing messages
    setIsLoadingMessages(true); // Set loading state
    
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId || !activeAccount) return;

    // Check cache first
    const cachedMessages = mailCache.getMessages(activeAccount.email, folderId);
    if (cachedMessages) {
      console.log('[Debug] Using cached messages for folder:', folderId);
      setMessages(cachedMessages.messages);
      setHasMoreMessages(!!cachedMessages.nextLink);
      setCurrentPage(cachedMessages.page);
      setIsLoadingMessages(false);
    } else {
      console.log('[Debug] No cached messages, fetching folder:', folderId);
      // Add a timeout to reset loading state if no response is received
      const timeoutId = setTimeout(() => {
        console.log('[Debug] Folder messages fetch timeout, resetting loading state');
        setIsLoadingMessages(false);
        setIsLoading(false);
      }, 10000); // 10 second timeout

      emitMailEvent.getFolder({
        appUserId,
        email: activeAccount.email,
        folderId,
        page: 1
      });

      return () => clearTimeout(timeoutId);
    }
  };

  const handleEmailClick = (email: MailMessage, event: React.MouseEvent) => {
    // Only handle click if it's not from the important button
    if (event?.target instanceof HTMLElement && event.target.closest('.important-button')) {
      return;
    }
    
    // Mark as read if needed
    if (!email.read) {
      const appUserId = localStorage.getItem('appUserId');
      if (!appUserId || !activeAccount) return;
      
      emitMailEvent.markRead({
        appUserId,
        email: activeAccount.email,
        messageId: email.id
      });
    }
  };

  const handleToggleImportant = async (email: MailMessage, event: React.MouseEvent) => {
    // Prevent the click from bubbling up to the email row
    event.stopPropagation();
    
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId || !activeAccount) return;
    
    emitMailEvent.markImportant({
      appUserId,
      email: activeAccount.email,
      messageId: email.id,
      flag: !email.important
    });

    // Optimistically update UI
    setMessages(prev => 
      prev.map(msg => 
        msg.id === email.id 
          ? { ...msg, important: !msg.important }
          : msg
      )
    );
  };

  const handleMarkAsRead = (messageId: string) => {
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId || !activeAccount) return;

    emitMailEvent.markRead({
      appUserId,
      email: activeAccount.email,
      messageId
    });

    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, read: true } : m)
    );
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMoreMessages || !activeAccount || !currentFolder) return;

    setIsLoadingMore(true);
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) return;

    const nextPage = currentPage + 1;
    console.log('[Debug] Loading more messages:', { nextPage, currentFolder });
    
    emitMailEvent.getFolder({
      appUserId,
      email: activeAccount.email,
      folderId: currentFolder,
      page: nextPage
    });
  };

  const handleAddAccount = () => {
    const appUserId = localStorage.getItem('appUserId')
    if (!appUserId) {
      router.push('/')
      return
    }

    // Open the OAuth window in a popup
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    // Create the OAuth URL with callback
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const callbackUrl = `${window.location.origin}/auth/callback`
    const authUrl = `${apiUrl}/auth/outlook/login?appUserId=${appUserId}&callbackUrl=${encodeURIComponent(callbackUrl)}`

    // Clear any existing popup poll timer
    if (window.addAccountPollTimer) {
      clearInterval(window.addAccountPollTimer)
    }

    // Open popup and handle messaging
    const popup = window.open(
      authUrl,
      'Add Outlook Account',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )

    // Check if popup was blocked
    if (!popup) {
      toast.error('Please allow popups to add a new account')
      return
    }

    // Focus the popup
    popup.focus()

    // Poll for popup close
    window.addAccountPollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(window.addAccountPollTimer)
        delete window.addAccountPollTimer
        fetchLinkedAccounts(false) // Refresh accounts list without changing active account
      }
    }, 500)
  }

  const handleLogout = () => {
    // Clear all local storage
    localStorage.removeItem('appUserId')
    localStorage.removeItem('accounts')
    localStorage.removeItem('linkedAccounts')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('token')

    // Clear the authentication cookie
    document.cookie = 'appUserId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

    // Disconnect socket
    disconnectSocket()

    // Show success message
    toast.success('Logged out successfully')

    // Redirect to landing page
    router.push('/')
  }

  const handleSkipSetup = () => {
    setShowSetupWizard(false)
  }

  const handleDelete = async (email: MailMessage, event: React.MouseEvent) => {
    // Prevent the click from bubbling up to the email row
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId || !activeAccount) return;
    
    try {
      emitMailEvent.deleteMessage({
        appUserId,
        email: activeAccount.email,
        messageId: email.id
      });

      // Optimistically update UI
      setMessages(prev => prev.filter(msg => msg.id !== email.id));
    } catch (error) {
      console.error('Failed to delete email:', error);
      toast.error('Failed to delete email');
    }
  };

  // Listen for delete confirmation
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDeleted = (data: { messageId: string }) => {
      // Remove the message from the list
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      
      // Update folder counts
      setFolders(prev => prev.map(folder => {
        const messageInFolder = messages.find(m => m.id === data.messageId && m.folder === folder.id);
        if (messageInFolder) {
          return {
            ...folder,
            totalItemCount: Math.max(0, (folder.totalItemCount || 0) - 1),
            unreadItemCount: messageInFolder.read ? folder.unreadItemCount : Math.max(0, (folder.unreadItemCount || 0) - 1)
          };
        }
        return folder;
      }));
      
      // Clear the message from cache
      if (activeAccount) {
        mailCache.clearMessage(activeAccount.email, data.messageId);
      }
      
      toast.success('Email deleted successfully');
    };

    socket.on('mail:deleted', handleDeleted);

    return () => {
      socket.off('mail:deleted', handleDeleted);
    };
  }, [socket, isConnected]);

  // Show setup wizard for new users
  if (showSetupWizard) {
    return <SetupWizard onAddAccount={handleAddAccount} onSkip={handleSkipSetup} />
  }

  // Show loading screen when loading or when we have an active account but folders haven't loaded
  if (isLoading || (activeAccount && !folders.length)) {
    return <LoadingScreen />
  }

  // Show empty state when no accounts are connected and setup was skipped
  if (!activeAccount && !showSetupWizard) {
    return (
      <div className="flex h-screen">
        <div className="w-16 bg-muted flex flex-col items-center py-4 border-r">
          <Button
            onClick={handleAddAccount}
            size="icon"
            className="rounded-full w-10 h-10 mb-2"
          >
            <IoMdAdd className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <CardTitle>No Email Accounts Connected</CardTitle>
              <CardDescription>Connect your first email account to start managing your emails</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={handleAddAccount} className="flex items-center gap-2">
                <IoMdAdd className="h-5 w-5" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Account Strip */}
        <div className="w-16 bg-muted flex flex-col items-center py-4 border-r">
          <div className="flex-1">
            <TooltipProvider>
              {linkedAccounts.map(account => (
                <Tooltip key={account.email}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveAccount(account)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all hover:scale-105 ${
                        activeAccount?.email === account.email
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-foreground hover:bg-accent'
                      }`}
                    >
                      <ProviderIcon 
                        provider={account.provider} 
                        className="w-5 h-5"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[300px] break-all">
                    <p className="flex items-center gap-2">
                      <ProviderIcon 
                        provider={account.provider} 
                        className="w-4 h-4"
                      />
                      {account.email}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleAddAccount}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-background text-foreground hover:bg-accent mt-2 transition-all hover:scale-105"
                  >
                    <IoMdAdd className="w-6 h-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="flex items-center gap-2">
                    <IoMdAdd className="w-4 h-4" />
                    Add new account
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-background text-foreground hover:bg-accent transition-all hover:scale-105"
                  >
                    <BarChart2 className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" />
                    Switch to Analytics
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ThemeToggle />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <FaUser className="w-5 h-5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex flex-col gap-1">
                  <p className="font-medium">Logged in as:</p>
                  <p className="text-sm  break-all">{userEmail}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-all hover:scale-105"
                  >
                    <IoMdLogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="flex items-center gap-2">
                    <IoMdLogOut className="w-4 h-4" />
                    Logout
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Folders */}
        <div className="w-64 border-r p-4">
          {/* AI-Enhanced View Button */}
          <Button 
            variant="outline" 
            className="w-full mb-4 flex items-center justify-center gap-2"
            onClick={() => router.push('/mail')}
          >
            <Sparkles className="h-4 w-4" />
            AI-Enhanced View
          </Button>

          <div className="space-y-2">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder.id)}
                className={`w-full rounded p-2 text-left hover:bg-accent ${
                  currentFolder === folder.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{folder.displayName}</span>
                    {folder.unreadItemCount > 0 && (
                      <Counter
                        value={folder.unreadItemCount}
                        className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full"
                      />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <Counter
                      value={folder.totalItemCount || 0}
                      className="text-muted-foreground"
                    />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto h-full p-4">
          {isLoadingMessages ? (
            <EmailListSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>No messages in this folder</p>
            </div>
          ) : (
            <div className="divide-y h-full">
              {messages.map((message) => (
                <Link 
                  href={`/email/${message.id}`} 
                  key={`message-${message.id}`}
                  onClick={(e) => handleEmailClick(message, e)}
                  className="block"
                >
                  <Card 
                    className={`mb-4 p-4 cursor-pointer relative hover:bg-accent/50 group ${
                      !message.read ? 'border-l-4 border-primary' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {message.from}
                          {message.important && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                        <div className="text-lg">{message.subject}</div>
                        <div className="mt-2 text-muted-foreground line-clamp-2">{message.preview}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          {new Date(message.timestamp).toLocaleString()}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!message.read && (
                              <DropdownMenuItem onClick={(e) => {
                                handleEmailClick(message, e);
                                handleMarkAsRead(message.id);
                              }}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => handleToggleImportant(message, e)}>
                              <Star className={cn(
                                "h-4 w-4 mr-2",
                                message.important && "fill-yellow-400 text-yellow-400"
                              )} />
                              {message.important ? 'Remove Important' : 'Mark as Important'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDelete(message, e)}
                              className="text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
              
              {hasMoreMessages && (
                <div className="mt-4 flex justify-center">
                  <Button 
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More Messages'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ComposeFAB />
    </div>
  )
}