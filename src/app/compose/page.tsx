import { ComposeEmail } from '@/components/ComposeEmail';
import { MailLayout } from '@/components/MailLayout';

export default function ComposePage() {
  return (
    <MailLayout>
      <ComposeEmail />
    </MailLayout>
  );
} 