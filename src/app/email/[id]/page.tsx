'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Mail, 
} from 'lucide-react'
import { initializeSocket, disconnectSocket, setSocketEventHandler, emitMailEvent } from '@/lib/socket'

interface EmailDetails {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  content: string;
  timestamp: string;
  read: boolean;
  folder: string | null;
  important: boolean;
  flagged: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    contentId?: string;
    contentType: string;
    size: number;
    isInline: boolean;
    contentBytes: string;
  }>;
}

export default function EmailDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [formattedTime, setFormattedTime] = useState('')
  const [email, setEmail] = useState<EmailDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (email?.timestamp) {
      const localTime = new Date(email.timestamp).toLocaleString()
      setFormattedTime(localTime)
    }
  }, [email?.timestamp, email?.id])

  useEffect(() => {
    let mounted = true
    const appUserId = localStorage.getItem('appUserId')
    const activeEmail = localStorage.getItem('activeEmail')

    const setupSocket = () => {
      if (!appUserId || !activeEmail) {
        console.error('Missing required data:', { appUserId, activeEmail })
        toast.error('Connection error')
        return false
      }

      initializeSocket(appUserId, activeEmail)

      // Set up event handlers
      setSocketEventHandler('mail:message', (details: EmailDetails) => {
        if (mounted) {
          console.log('Received email details:', details)
          setEmail(details)
          setIsLoading(false)

          // Always mark email as read when loaded
          const appUserId = localStorage.getItem('appUserId')
          const activeEmail = localStorage.getItem('activeEmail')
          if (appUserId && activeEmail) {
            emitMailEvent.markRead({
              appUserId,
              email: activeEmail,
              messageId: details.id
            })
          }
        }
      })

      setSocketEventHandler('mail:markedRead', (messageId) => {
        if (mounted && email?.id === messageId) {
          setEmail(prev => prev ? { ...prev, read: true } : null)
        }
      })

      setSocketEventHandler('mail:error', (error) => {
        console.error('Email fetch error:', error)
        if (mounted) {
          toast.error(error)
          setIsLoading(false)
        }
      })

      // Request email details
      console.log('Requesting email details:', { messageId: params.id, activeEmail })
      emitMailEvent.getMessage({
        appUserId,
        email: activeEmail,
        messageId: params.id as string
      })

      return true
    }

    setupSocket()

    return () => {
      mounted = false
      disconnectSocket()
    }
  }, [params.id])

  const handleBack = () => {
    router.push('/dashboard')
  }

//   const handleReply = () => {
//     toast.info('Reply feature coming soon')
//   }

//   const handleReplyAll = () => {
//     toast.info('Reply All feature coming soon')
//   }

//   const handleForward = () => {
//     toast.info('Forward feature coming soon')
//   }

//   const handleDelete = () => {
//     toast.info('Delete feature coming soon')
//   }

//   const handleArchive = () => {
//     toast.info('Archive feature coming soon')
//   }

//   const handleToggleImportant = () => {
//     if (!email) return

//     const appUserId = localStorage.getItem('appUserId')
//     const activeEmail = localStorage.getItem('activeEmail')

//     if (!appUserId || !activeEmail) return

//     emitMailEvent.markImportant({
//       appUserId,
//       email: activeEmail,
//       messageId: email.id,
//       flag: !email.important
//     })

//     setEmail(prev => prev ? { ...prev, important: !prev.important } : null)
//   }

  if (isLoading) {
    return (
      <div className="h-full p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Email Not Found</h2>
          <p className="text-muted-foreground">This email may have been moved or deleted.</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6 space-y-1">
      <div className="flex items-center justify-between">
       
        {/* <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleReply}>
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReplyAll}>
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleForward}>
            <Forward className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="icon" onClick={handleArchive}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleImportant}
            className={email?.important ? 'text-yellow-500' : ''}
          >
            <Star className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleReply}>Reply</DropdownMenuItem>
              <DropdownMenuItem onClick={handleReplyAll}>Reply All</DropdownMenuItem>
              <DropdownMenuItem onClick={handleForward}>Forward</DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>Archive</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div> */}
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
           <div>
           <h1 className="text-2xl font-semibold">{email?.subject}</h1>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              <Avatar>
                <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground">
                  <Mail className="h-4 w-4" />
                </div>
              </Avatar>
              <div>
                <div>{email?.from}</div>
                {/* <div className="text-sm">To: {email?.to}</div> */}
                {email?.cc && <div className="text-sm">Cc: {email?.cc}</div>}
              </div>
            </div>
           </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {formattedTime}
          </div>
        </div>

        <Separator />

        <div className="prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: email?.content || '' }} />
        </div>

        {/* {email?.attachments && email.attachments.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Attachments</h2>
              <div className="grid gap-2">
                {email.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <div>
                        <div>{attachment.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )} */}
      </div>
    </div>
  )
} 