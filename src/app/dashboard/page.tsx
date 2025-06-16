import { Metadata } from "next"
import { DashboardHeader } from "@/components/header"
import { EmailAnalytics } from "@/components/dashboard/email-analytics"
import { MailLayout } from "@/components/MailLayout"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Email Analytics Dashboard",
}

export default async function DashboardPage() {
  return (
    <MailLayout>
      <div className="h-full overflow-auto p-6">
        <DashboardHeader
          heading="Email Analytics"
          text="View detailed analytics about your emails"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
          <EmailAnalytics />
        </div>
      </div>
    </MailLayout>
  )
}
