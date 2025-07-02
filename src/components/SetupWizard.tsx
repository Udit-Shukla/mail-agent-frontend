import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SiGmail } from 'react-icons/si'
import { PiMicrosoftOutlookLogoDuotone } from 'react-icons/pi'
import { useState, useEffect } from 'react'
import { CategoryModal } from "@/components/CategoryModal"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'

interface SetupWizardProps {
  onAddAccount: () => void;
  onSkip: () => void;
}

export function SetupWizard({ onAddAccount, onSkip }: SetupWizardProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const router = useRouter()

  const handleAddAccount = () => {
    // Show category modal after account connection
    setIsCategoryModalOpen(true)
    onAddAccount()
  }

  const handleSaveCategories = async () => {
    try {
      toast.success('Categories saved successfully')
      setIsCategoryModalOpen(false)
      onSkip() // Navigate to dashboard after saving categories
    } catch (error) {
      console.error('Error saving categories:', error)
      toast.error('Failed to save categories')
    }
  }

  // Add message event listener for auth callbacks
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify the origin of the message
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'AUTH_SUCCESS') {
        toast.success(`Successfully connected ${event.data.email}`);
        // Redirect to emailList page
        router.push('/emailList');
      } else if (event.data.type === 'AUTH_ERROR') {
        toast.error(event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Mail Agent</CardTitle>
          <CardDescription>Connect your first email account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Button
              onClick={handleAddAccount}
              className="flex items-center justify-center gap-2 h-12"
              size="lg"
            >
              <PiMicrosoftOutlookLogoDuotone className="h-5 w-5" />
              Connect Outlook Account
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 h-12"
              size="lg"
              disabled
            >
              <SiGmail className="h-5 w-5" />
              Connect Gmail Account
              <span className="text-xs text-muted-foreground">(Coming Soon)</span>
            </Button>
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategories}
      />
    </div>
  )
} 