import { MailLayout } from '@/components/MailLayout';
import { EnrichedEmailList } from '@/components/EnrichedEmailList';
import { Suspense } from 'react';

export default function MailPage() {
  return (
    <MailLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <EnrichedEmailList />
      </Suspense>
    </MailLayout>
  );
} 