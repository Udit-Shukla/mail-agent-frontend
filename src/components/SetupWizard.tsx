import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SiGmail } from 'react-icons/si'
import { PiMicrosoftOutlookLogoDuotone } from 'react-icons/pi'

interface SetupWizardProps {
  onAddAccount: () => void;
  onSkip: () => void;
}

export function SetupWizard({ onAddAccount, onSkip }: SetupWizardProps) {
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
              onClick={onAddAccount}
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
    </div>
  )
} 