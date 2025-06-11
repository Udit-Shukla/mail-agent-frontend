'use client'
import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Account, Provider } from '@/lib/types';
import { IoMdAdd, IoMdLogOut } from 'react-icons/io';
import { FaUser } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';
import { PiMicrosoftOutlookLogoDuotone } from "react-icons/pi";

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
  const [linkedAccounts, setLinkedAccounts] = React.useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = React.useState<Account | null>(null);
  const [userEmail, setUserEmail] = React.useState<string>('');

  // Fetch linked accounts
  const fetchLinkedAccounts = useCallback(async (setDefault = true) => {
    try {
      const appUserId = localStorage.getItem('appUserId');
      if (!appUserId) {
        router.push('/');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/account/accounts?appUserId=${appUserId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      const apiAccounts = data.accounts || [];

      setLinkedAccounts(apiAccounts);
      
      if (apiAccounts.length > 0 && setDefault) {
        setActiveAccount(apiAccounts[0]);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, [router]);

  // Handle account switching
  const handleAccountSwitch = (account: Account) => {
    setActiveAccount(account);
    localStorage.setItem('activeEmail', account.email);
    // Refresh the current page to reinitialize with new account
    router.refresh();
  };

  const handleAddAccount = () => {
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) {
      router.push('/');
      return;
    }

    // Open the OAuth window in a popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Create the OAuth URL with callback
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const authUrl = `${apiUrl}/auth/outlook/login?appUserId=${appUserId}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

    // Clear any existing popup poll timer
    if (window.addAccountPollTimer) {
      clearInterval(window.addAccountPollTimer);
    }

    // Open popup and handle messaging
    const popup = window.open(
      authUrl,
      'Add Outlook Account',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    // Check if popup was blocked
    if (!popup) {
      console.error('Please allow popups to add a new account');
      return;
    }

    // Focus the popup
    popup.focus();

    // Poll for popup close
    window.addAccountPollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(window.addAccountPollTimer);
        delete window.addAccountPollTimer;
        fetchLinkedAccounts(false);
      }
    }, 500);
  };

  const handleLogout = () => {
    localStorage.removeItem('appUserId');
    localStorage.removeItem('accounts');
    localStorage.removeItem('linkedAccounts');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    
    document.cookie = 'appUserId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    router.push('/');
  };

  React.useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) setUserEmail(email);
    fetchLinkedAccounts();
  }, [fetchLinkedAccounts]);

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
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <FaUser className="w-5 h-5" />
                </div>
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

      {/* Main Content */}
      <div className="flex-1 flex">
        {children}
      </div>
    </div>
  );
} 