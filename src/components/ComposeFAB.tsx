'use client';

import { Button } from '@/components/ui/button';
import { Feather } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ComposeFAB = () => {
  const router = useRouter();

  const handleCompose = () => {
    router.push('/compose');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleCompose}
            className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center bg-primary hover:bg-primary/90 p-0"
            size="lg"
          >
           <Feather style={{ width: 28, height: 28 }} strokeWidth={1.5} />

          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-primary text-primary-foreground">
          <p>Compose New Email</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 