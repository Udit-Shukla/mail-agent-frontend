'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface AuthError extends Error {
  message: string;
}

interface Account {
  email: string;
  provider: 'outlook' | 'gmail';
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const appUserId = searchParams.get('appUserId')
      const provider = searchParams.get('provider')
      const email = searchParams.get('email')
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      const errorDetails = searchParams.get('error_details')

      if (error) {
        toast.error(errorDetails || 'Failed to connect account')
        router.push('/dashboard')
        return
      }

      if (!appUserId || !provider || !email || success !== 'true') {
        toast.error('Invalid callback parameters')
        router.push('/dashboard')
        return
      }

      try {
        // Verify the account was properly saved
        const response = await fetch('http://localhost:8000/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appUserId,
            provider,
            email,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify account')
        }

        if (!data.success) {
          throw new Error(data.error || 'Account verification failed')
        }
        
        // Update local storage with new account info
        const currentAccounts: Account[] = JSON.parse(localStorage.getItem('linkedAccounts') || '[]')
        const newAccount: Account = { email, provider: provider as 'outlook' | 'gmail' }
        
        // Check if account already exists
        const exists = currentAccounts.some(acc => acc.email === email)
        if (!exists) {
          currentAccounts.push(newAccount)
          localStorage.setItem('linkedAccounts', JSON.stringify(currentAccounts))
          console.log('✅ Saved account to local storage:', newAccount)
        }

        toast.success(`Successfully connected ${email}`)
        
        // Close this window and refresh the dashboard
        if (window.opener) {
          window.opener.location.reload()
          window.close()
        } else {
          router.push('/dashboard')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        const error = err as AuthError
        toast.error(error.message || 'Failed to complete authentication')
        router.push('/dashboard')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Completing Authentication...</h2>
        <p className="text-muted-foreground">Please wait while we connect your account.</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we prepare the authentication page.</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
} 