'use client'
import React, { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Account, Provider } from '@/lib/types';
import { IoMdAdd, IoMdLogOut } from 'react-icons/io';
import { SiGmail } from 'react-icons/si';
import { PiMicrosoftOutlookLogoDuotone } from "react-icons/pi";
import { ComposeFAB } from '@/components/ComposeFAB';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';
import { FaUser } from 'react-icons/fa';
import { Sparkles, BarChart2, Plus } from 'lucide-react';
import { SetupWizard } from '@/components/SetupWizard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { CategoryModal } from "@/components/CategoryModal";
import { updateCategories, type Category } from "@/lib/api/categories";
import { type EmailCategory } from "@/lib/api/emailCategories";
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

const ProviderIcon = ({ provider, className }: { provider: Provider, className?: string }) => {
  if (provider === 'outlook') {
    return <PiMicrosoftOutlookLogoDuotone className={className} />
  }
  return <SiGmail className={className} />
}

interface MailLayoutProps {
  children: React.ReactNode;
}

export function MailLayout({ children }: MailLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [linkedAccounts, setLinkedAccounts] = React.useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = React.useState<Account | null>(null);
  const [userEmail, setUserEmail] = React.useState('');
  const [showSetupWizard, setShowSetupWizard] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);

  const fetchLinkedAccounts = useCallback(async () => {
    try {
      const appUserId = localStorage.getItem('appUserId');
      if (!appUserId) {
        router.push('/');
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/account/accounts?appUserId=${appUserId}`);
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        const accounts = data.accounts || [];
        
        setLinkedAccounts(accounts);
        if (accounts.length > 0) {
          // Only set if not already set
          const existing = localStorage.getItem('activeEmail');
          const found = accounts.find((acc: Account) => acc.email === existing);
          if (existing && found) {
            setActiveAccount(found);
          } else {
            setActiveAccount(accounts[0]);
            localStorage.setItem('activeEmail', accounts[0].email);
          }
          // Set the inbox folder ID for the active account
          localStorage.setItem('inboxFolderId', 'Inbox');
          console.log('🔄 MailLayout: Initial account setup - activeEmail:', localStorage.getItem('activeEmail'), 'inboxFolderId: Inbox');
          setShowSetupWizard(false);
        } else {
          setShowSetupWizard(true);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load accounts');
        setShowSetupWizard(true);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing accounts:', error);
      toast.error('Failed to load accounts');
      setIsLoading(false);
      setShowSetupWizard(true);
    }
  }, [router]);

  // Set user email from localStorage when component mounts
  React.useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    }
  }, []);

  // Effect for setting active email in localStorage when activeAccount changes
  React.useEffect(() => {
    if (activeAccount) {
      localStorage.setItem('activeEmail', activeAccount.email);
      // Set the inbox folder ID - default to "Inbox" for all accounts
      localStorage.setItem('inboxFolderId', 'Inbox');
      console.log('🔄 MailLayout: Set activeEmail to', activeAccount.email, 'and inboxFolderId to Inbox');
    }
  }, [activeAccount]);

  const handleAccountSwitch = useCallback((account: Account) => {
    setActiveAccount(account);
    localStorage.setItem('activeEmail', account.email);
    // Set the inbox folder ID when switching accounts
    localStorage.setItem('inboxFolderId', 'Inbox');
    console.log('🔄 MailLayout: Switched to account', account.email, 'and set inboxFolderId to Inbox');
  }, []);

  const handleAddAccount = useCallback(() => {
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
    window.addAccountPollTimer = setInterval(async () => {
      if (popup.closed) {
        clearInterval(window.addAccountPollTimer)
        delete window.addAccountPollTimer
        
        // Refresh accounts list
        await fetchLinkedAccounts()
        
        // If we have accounts now, show the category modal
        if (linkedAccounts.length > 0) {
          try {
            setIsCategoryModalOpen(true)
          } catch (error) {
            console.error('Error showing category modal:', error)
            toast.error('Failed to show category modal')
          }
        }
      }
    }, 500)
  }, [router, fetchLinkedAccounts, linkedAccounts.length]);

  const handleSaveCategories = async (categories: EmailCategory[]) => {
    try {
      // Convert EmailCategory[] to Category[] by transforming createdAt
      const convertedCategories: Category[] = categories.map(cat => ({
        ...cat,
        createdAt: cat.createdAt ? new Date(cat.createdAt) : undefined
      }));
      
      await updateCategories(convertedCategories)
      toast.success('Categories updated successfully')
      setIsCategoryModalOpen(false)
      // Don't show setup wizard after categories are saved - user should see the main dashboard
    } catch (error) {
      console.error('Error updating categories:', error)
      toast.error('Failed to update categories')
    }
  };

  const handleSkipSetup = useCallback(() => {
    setShowSetupWizard(false);
  }, []);

  const handleLogout = useCallback(() => {
    // Clear all local storage
    localStorage.removeItem('appUserId');
    localStorage.removeItem('accounts');
    localStorage.removeItem('linkedAccounts');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');

    // Clear the authentication cookie
    document.cookie = 'appUserId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    // Show success message
    toast.success('Logged out successfully');

    // Redirect to landing page
    router.push('/');
  }, [router]);

  const handleViewToggle = useCallback(() => {
    if (pathname === '/mail') {
      router.push('/dashboard');
    } else {
      router.push('/mail');
    }
  }, [router, pathname]);

  // Add message event listener for auth callbacks
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify the origin of the message
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'AUTH_SUCCESS') {
        toast.success(`Successfully connected ${event.data.email}`);
        // Refresh accounts list
        await fetchLinkedAccounts();
        // Show category modal
        try {
          setIsCategoryModalOpen(true);
        } catch (error) {
          console.error('Error showing category modal:', error);
          toast.error('Failed to show category modal');
        }
      } else if (event.data.type === 'AUTH_ERROR') {
        toast.error(event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchLinkedAccounts]);

  React.useEffect(() => {
    fetchLinkedAccounts();
  }, [fetchLinkedAccounts]);

  // Show setup wizard for new users
  if (showSetupWizard) {
    return <SetupWizard onAddAccount={handleAddAccount} onSkip={handleSkipSetup} />;
  }

  // Show loading screen when loading
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show empty state when no accounts are linked
  if (linkedAccounts.length === 0) {
    return (
      <div className="flex h-screen">
        {/* Account Strip - Unified for all states */}
        <div className="w-16 bg-muted flex flex-col items-center py-4 border-r">
          <div className="flex-1">
            <TooltipProvider>
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
            <ThemeToggle />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105"
                  >
                    <FaUser className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex flex-col gap-1">
                  <p className="font-medium">Logged in as:</p>
                  <p className="text-sm break-all">{userEmail}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-background text-foreground hover:bg-accent transition-all hover:scale-105"
                  >
                    <IoMdLogOut className="w-5 h-5" />
                  </button>
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
        
        {/* Empty State Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex items-center justify-center bg-background p-4">
            <div className="text-center max-w-md">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">No email accounts connected</h2>
              <p className="text-muted-foreground mb-6">
                Connect your email accounts to start using Mail Agent and view your analytics.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={handleAddAccount}
                  className="flex items-center justify-center gap-2 h-12"
                  size="lg"
                >
                  <Plus className="h-5 w-5" />
                  Start Setup
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Account Strip - Unified for all states */}
      <div className="w-16 bg-muted flex flex-col items-center py-4 border-r">
        <div className="flex-1">
          <TooltipProvider>
            {linkedAccounts.map(account => (
              <Tooltip key={account.email}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleAccountSwitch(account)}
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
                  onClick={handleViewToggle}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-background text-foreground hover:bg-accent transition-all hover:scale-105"
                >
                  {pathname === '/mail' ? (
                    <BarChart2 className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="flex items-center gap-2">
                  {pathname === '/mail' ? (
                    <>
                      <BarChart2 className="w-4 h-4" />
                      Switch to Analytics
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Switch to AI View
                    </>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/profile')}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105"
                >
                  <FaUser className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col gap-1">
                <p className="font-medium">Logged in as:</p>
                <p className="text-sm break-all">{userEmail}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-background text-foreground hover:bg-accent transition-all hover:scale-105"
                >
                  <IoMdLogOut className="w-5 h-5" />
                </button>
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
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      
      {/* Only show ComposeFAB on dashboard and mail pages, not on compose or reply pages */}
      {!pathname.includes('/compose') && !pathname.includes('/reply') && (
        <ComposeFAB />
      )}

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategories}
      />
    </div>
  );
} 