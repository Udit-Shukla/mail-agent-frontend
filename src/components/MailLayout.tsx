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
import { Sparkles, BarChart2 } from 'lucide-react';

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

  const fetchLinkedAccounts = useCallback(async () => {
    try {
      const appUserId = localStorage.getItem('appUserId');
      if (!appUserId) {
        router.push('/');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/account/accounts?appUserId=${appUserId}`);
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      const accounts = data.accounts || [];
      
      setLinkedAccounts(accounts);
      if (accounts.length > 0 && !activeAccount) {
        setActiveAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    }
  }, [router, activeAccount]);

  // Set user email from localStorage when component mounts
  React.useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    }
  }, []);

  const handleAccountSwitch = useCallback((account: Account) => {
    setActiveAccount(account);
  }, []);

  const handleAddAccount = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

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

  React.useEffect(() => {
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
      
      <ComposeFAB />
    </div>
  );
} 