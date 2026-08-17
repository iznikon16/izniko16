'use client';

import { useFormStatus } from 'react-dom';
import { LoaderCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DeleteSubmitButtonProps = {
  className?: string;
  confirmMessage: string;
  label?: string;
};

export function DeleteSubmitButton({ className, confirmMessage, label = 'Sil' }: DeleteSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }

        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={cn(className)}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {pending ? 'Siliniyor...' : label}
    </Button>
  );
}
