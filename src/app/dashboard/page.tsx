'use client'

import { DashboardHeader } from "@/components/header"
import { EmailAnalytics } from "@/components/dashboard/email-analytics"
import { MailLayout } from "@/components/MailLayout"

export default function DashboardPage() {
  return (
    <MailLayout>
      <div className="h-full overflow-auto p-6">
        <DashboardHeader
          heading="Email Analytics"
          text="The dashboard only contains latest emails. It will get smarter as you scroll through your email list"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
          <div className="col-span-full lg:col-span-7">
            <EmailAnalytics />
          </div>
        </div>
      </div>
    </MailLayout>
  )
}
