'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SiGmail } from 'react-icons/si'
import { PiMicrosoftOutlookLogoDuotone } from 'react-icons/pi'
import { IoMdMail } from 'react-icons/io'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <IoMdMail className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Mail Agent by WorxStream</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Login
            </Button>
            <Button onClick={() => router.push('/register')}>
              Try Now
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="rounded-full bg-primary/10 p-4">
            <IoMdMail className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            Mail Agent by WorxStream
          </h1>
          <p className="max-w-[600px] text-lg text-muted-foreground sm:text-xl">
            Your intelligent email companion powered by WorxStream. Connect multiple email accounts and manage them all in one place.
          </p>
          <div className="flex gap-4">
            <Button size="lg" onClick={() => router.push('/register')}>
              Try Now - It&apos;s Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Multiple Accounts</CardTitle>
              <CardDescription>
                Connect and manage multiple email accounts from different providers in one unified interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center space-x-4">
              <PiMicrosoftOutlookLogoDuotone className="h-8 w-8" />
              <SiGmail className="h-8 w-8" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time Sync</CardTitle>
              <CardDescription>
                Get instant notifications and real-time updates for all your connected email accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg
                className="h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Your data is encrypted and secure. We never store your email passwords.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg
                className="h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Part of WorxStream Ecosystem</CardTitle>
              <CardDescription>
                Seamlessly integrate with other WorxStream tools and services for a complete productivity solution.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <svg
                className="h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
