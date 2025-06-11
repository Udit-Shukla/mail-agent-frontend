'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { initializeSocket, disconnectSocket, setSocketEventHandler, emitMailEvent } from '@/lib/socket'
import { mailCache } from '@/lib/cache'
import { MailFolder, MailMessage, Account, Provider } from '@/lib/types'
import { toast } from 'sonner'
import { LoadingScreen } from '@/components/LoadingScreen'
import { Loader2, MoreVertical, Star, Sparkles } from 'lucide-react'
import { SiGmail} from 'react-icons/si'
import { PiMicrosoftOutlookLogoDuotone } from "react-icons/pi";
import { IoMdAdd, IoMdLogOut } from 'react-icons/io'
import { FaUser } from 'react-icons/fa'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { useSocket } from '@/contexts/SocketContext'


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
  const socketInitialized = useRef(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [showDateModal, setShowDateModal] = useState(false)
  const [syncStartDate, setSyncStartDate] = useState<Date | null>(null)
  const [syncEndDate, setSyncEndDate] = useState<Date>(new Date())
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchLinkedAccounts = async (setDefault = true) => {
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
  }

  // Add a function to refresh current folder data
  const refreshCurrentFolder = () => {
    if (!activeAccount || !currentFolder) return;

    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) return;

    // Re-fetch messages for current folder
    emitMailEvent.getFolder({
      appUserId,
      email: activeAccount.email,
      folderId: currentFolder,
      page: 1
    });

    // Re-initialize socket to get updated folders
    if (appUserId && activeAccount) {
      initializeSocket(appUserId, activeAccount.email);
    }
  };

  // Effect for socket initialization
  useEffect(() => {
    if (!activeAccount) return;
  
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) {
      router.push('/');
      return;
    }
  
    if (!socketInitialized.current) {
      console.log('[Socket] Initializing socket...');
      socketInitialized.current = true;
  
      let retryCount = 0;
      const maxRetries = 3;
  
      const initSocket = () => {
        const socket = initializeSocket(appUserId, activeAccount.email);
        
        // Set up sync event handlers
        setSocketEventHandler('mail:promptDateRange', () => {
          setShowDateModal(true);
        });

        setSocketEventHandler('mail:new', (message) => {
          // If message belongs to current folder, add it to the list
          if (message.folder === currentFolder) {
            setMessages(prev => [{ ...message, flagged: false }, ...prev]);
          }
          // Update folder unread count
          setFolders(prev => prev.map(folder => 
            folder.id === message.folder 
              ? { ...folder, unreadItemCount: folder.unreadItemCount + (message.read ? 0 : 1) }
              : folder
          ));
        });

        setSocketEventHandler('mail:syncComplete', () => {
          setIsSyncing(false);
          toast.success('Mailbox sync completed');
        });

        // Check cache first for folders
        const cachedFolders = mailCache.getFolders(activeAccount.email);
        if (cachedFolders) {
          console.log('[Cache] Using cached folders');
          setFolders(cachedFolders);
          setIsLoading(false);

          const inbox = cachedFolders.find(f => f.displayName.toLowerCase() === 'inbox');
          if (inbox && !currentFolderRef.current) {
            setCurrentFolder(inbox.id);
            currentFolderRef.current = inbox.id;
            
            // Check cache for inbox messages
            const cachedMessages = mailCache.getMessages(activeAccount.email, inbox.id);
            if (cachedMessages) {
              console.log('[Cache] Using cached messages for inbox');
              setMessages(cachedMessages.messages);
              setHasMoreMessages(!!cachedMessages.nextLink);
              setCurrentPage(cachedMessages.page);
              setIsLoading(false);
            } else {
              emitMailEvent.getFolder({
                appUserId,
                email: activeAccount.email,
                folderId: inbox.id,
                page: 1
              });
            }
          }
        } else {
          // Set up event handlers for folders
          setSocketEventHandler('mail:folders', (folders) => {
            console.log('[Socket] Received folders', folders);
            mailCache.setFolders(activeAccount.email, folders);
            setFolders(folders);
            setIsLoading(false);

            const inbox = folders.find(f => f.displayName.toLowerCase() === 'inbox');
            if (inbox && !currentFolderRef.current) {
              setCurrentFolder(inbox.id);
              currentFolderRef.current = inbox.id;

              emitMailEvent.getFolder({
                appUserId,
                email: activeAccount.email,
                folderId: inbox.id,
                page: 1
              });
            }
          });
        }

        // Set up event handlers for messages
        setSocketEventHandler('mail:folderMessages', ({ folderId, messages: newMessages, nextLink, page }) => {
          console.log('[Socket] Received messages for', folderId);
          if (folderId === currentFolderRef.current || folderId === currentFolder) {
            if (page === 1) {
              const messagesWithFlagged = newMessages.map(msg => ({ ...msg, flagged: false }));
              mailCache.setMessages(activeAccount.email, folderId, messagesWithFlagged, nextLink, page);
              setMessages(messagesWithFlagged);
            } else {
              const messagesWithFlagged = newMessages.map(msg => ({ ...msg, flagged: false }));
              mailCache.appendMessages(activeAccount.email, folderId, messagesWithFlagged, nextLink, page);
              setMessages(prev => [...prev, ...messagesWithFlagged]);
            }
            setHasMoreMessages(!!nextLink);
            setIsLoadingMore(false);
            setIsLoading(false);
          }
        });

        setSocketEventHandler('mail:importantMarked', ({ messageId, flag }) => {
          if (currentFolder) {
            mailCache.updateMessage(activeAccount.email, currentFolder, messageId, { important: flag });
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, important: flag } : m));
          }
        });

        setSocketEventHandler('mail:markedRead', (messageId) => {
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
        });

        setSocketEventHandler('mail:error', (error) => {
          console.error('[Socket] Error:', error);
          if (error.includes('Token not found') || error.includes('Token expired')) {
            toast.error('Session expired. Please refresh the page.');
            return;
          }
          if (!error.includes('Token not found')) {
            toast.error(error);
          }
        });
  
        socket.on('connect', () => {
          console.log('[Socket] Connected:', socket.id);
          retryCount = 0;
        });
  
        socket.on('connect_error', (err) => {
          console.error('[Socket] Connection failed:', err);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            toast.error('Unable to connect to mail server. Please refresh the page.');
            return;
          }
          
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(initSocket, retryDelay);
        });
  
        socket.on('disconnect', (reason) => {
          console.log('[Socket] Disconnected:', reason);
          if (reason === 'io server disconnect' || reason === 'transport close') {
            socket.connect();
          }
        });
      };
  
      initSocket();
      fetchLinkedAccounts(false);
  
      return () => {
        console.log('[Socket] Cleaning up event handlers...');
        socketInitialized.current = false;
        setSocketEventHandler('mail:folders', () => {});
        setSocketEventHandler('mail:folderMessages', () => {});
        setSocketEventHandler('mail:importantMarked', () => {});
        setSocketEventHandler('mail:markedRead', () => {});
        setSocketEventHandler('mail:error', () => {});
        setSocketEventHandler('mail:promptDateRange', () => {});
        setSocketEventHandler('mail:new', () => {});
        setSocketEventHandler('mail:syncComplete', () => {});
      };
    }
  }, [activeAccount]);

  const handleSyncRangeSubmit = () => {
    const appUserId = localStorage.getItem('appUserId')
    if (!activeAccount || !syncStartDate || !appUserId) return
  
    setIsSyncing(true)
    setShowDateModal(false)
  
    emitMailEvent.syncInRange({
      appUserId,
      email: activeAccount.email,
      startDate: syncStartDate.toISOString(),
      endDate: syncEndDate.toISOString()
    })
  }
  
  
  useEffect(() => {
    if (!activeAccount || !currentFolder) return;

    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) return;

    // Check cache first
    const cachedMessages = mailCache.getMessages(activeAccount.email, currentFolder);
    if (cachedMessages) {
      console.log('[Cache] Using cached messages for folder:', currentFolder);
      setMessages(cachedMessages.messages);
      setHasMoreMessages(!!cachedMessages.nextLink);
      setCurrentPage(cachedMessages.page);
      setIsLoading(false);
    } else {
      // Re-fetch messages when not in cache
      setIsLoading(true);
      setMessages([]);
      setCurrentPage(1);
      setHasMoreMessages(false);

      emitMailEvent.getFolder({
        appUserId,
        email: activeAccount.email,
        folderId: currentFolder,
        page: 1
      });
    }
  }, [activeAccount, currentFolder]);

  // Effect for visibility changes and initial data load
  useEffect(() => {
    let pageHidden = false;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pageHidden) {
        pageHidden = false;
        refreshCurrentFolder();
      } else if (document.visibilityState === 'hidden') {
        pageHidden = true;
      }
    };

    // Refresh when component mounts
    refreshCurrentFolder();

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeAccount, currentFolder]);

  // Effect for initial data loading
  useEffect(() => {
    const email = localStorage.getItem('userEmail')
    if (email) {
      setUserEmail(email)
    }
    fetchLinkedAccounts()
  }, [])

  const handleFolderClick = (folderId: string) => {
    if (folderId === currentFolder || !activeAccount) return;

    setCurrentFolder(folderId);
    currentFolderRef.current = folderId;

    // Check cache first
    const cachedMessages = mailCache.getMessages(activeAccount.email, folderId);
    if (cachedMessages) {
      console.log('[Cache] Using cached messages for folder:', folderId);
      setMessages(cachedMessages.messages);
      setHasMoreMessages(!!cachedMessages.nextLink);
      setCurrentPage(cachedMessages.page);
      setIsLoading(false);
    } else {
      setCurrentPage(1);
      setMessages([]);
      setHasMoreMessages(false);
      setIsLoading(true);

      const appUserId = localStorage.getItem('appUserId');
      if (!appUserId) return;

      emitMailEvent.getFolder({
        appUserId,
        email: activeAccount.email,
        folderId,
        page: 1
      });
    }
  };

  const handleMarkAsImportant = (messageId: string) => {
    const appUserId = localStorage.getItem('appUserId');
    const msg = messages.find(m => m.id === messageId);
    if (!appUserId || !msg || !activeAccount) return;
    
    const flag = !msg.important;
    emitMailEvent.markImportant({
      appUserId,
      email: activeAccount.email,
      messageId,
      flag
    });

    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, important: flag } : m)
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
    if (!currentFolder || !activeAccount || isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) return;

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
              {folder.displayName}
              {folder.unreadItemCount > 0 && (
                <span className="ml-2 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
                  {folder.unreadItemCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Link 
                href={`/email/${message.id}`} 
                key={`message-${message.id}`}
                onClick={() => {
                  if (activeAccount) {
                    localStorage.setItem('activeEmail', activeAccount.email)
                  }
                }}
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
                            <DropdownMenuItem onClick={() => handleMarkAsRead(message.id)}>
                              Mark as Read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleMarkAsImportant(message.id)}>
                            {message.important ? 'Remove Important' : 'Mark as Important'}
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
            
            {!isLoading && messages.length === 0 && (
              <div className="text-center text-muted-foreground mt-8">
                No messages in this folder
              </div>
            )}
          </>
        )}
      </div>
      <Dialog open={showDateModal} onOpenChange={setShowDateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select date range to sync your mailbox</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Calendar 
                mode="single" 
                selected={syncStartDate || undefined}
                onSelect={(date: Date | undefined) => setSyncStartDate(date || null)}
                disabled={[
                  (date) => date > new Date(),
                  (date) => date > syncEndDate
                ]}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Calendar 
                mode="single" 
                selected={syncEndDate}
                onSelect={setSyncEndDate}
                disabled={[
                  (date) => date > new Date(),
                  (date) => syncStartDate ? date < syncStartDate : false
                ]}
                required
              />
            </div>
            <Button
              disabled={!syncStartDate || isSyncing}
              onClick={handleSyncRangeSubmit}
              className="w-full"
            >
              {isSyncing ? 'Syncing...' : 'Start Sync'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}