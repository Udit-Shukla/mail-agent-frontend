'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SiGmail } from 'react-icons/si'
import { PiMicrosoftOutlookLogoDuotone } from 'react-icons/pi'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowRight, Shield, Zap, Users, Sparkles, Mail, Lock, RefreshCw } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/20 backdrop-blur-sm bg-white/10 dark:bg-slate-900/10">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Mail Agent
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">by WorxStream</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              onClick={() => router.push('/login')}
              className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Login
            </Button>
            <Button 
              onClick={() => router.push('/register')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Try Now
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Mail className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
              Mail Agent
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Your intelligent email companion powered by WorxStream. Connect multiple email accounts and manage them all in one place.
            </p>
          </div>
          
          <div className="flex gap-4 flex-wrap justify-center">
            <Button 
              size="lg" 
              onClick={() => router.push('/register')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-8 py-3 text-lg"
            >
              Try Now - It&apos;s Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => router.push('/login')}
              className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-3 text-lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Everything you need to manage your emails efficiently and securely
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Multiple Accounts
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Connect and manage multiple email accounts from different providers in one unified interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center space-x-6">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                <PiMicrosoftOutlookLogoDuotone className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Outlook</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                <SiGmail className="h-6 w-6 text-red-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Gmail</span>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Real-time Sync
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Get instant notifications and real-time updates for all your connected email accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Live Updates</span>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Secure & Private
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Your data is encrypted and secure. We never store your email passwords.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
                <Lock className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">End-to-End Encrypted</span>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                WorxStream Ecosystem
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Seamlessly integrate with other WorxStream tools and services for a complete productivity solution.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Integrated Platform</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center">
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-2xl max-w-2xl mx-auto">
            <CardContent className="p-12">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Join thousands of users who are already managing their emails more efficiently with Mail Agent.
              </p>
              <Button 
                size="lg" 
                onClick={() => router.push('/register')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-8 py-3 text-lg"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/20 backdrop-blur-sm bg-white/10 dark:bg-slate-900/10">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <p>© 2024 WorxStream. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
