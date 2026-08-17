'use client';

import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';

import { Button } from './button';

type FormSubmitButtonProps = {
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  idleLabel: string;
  pendingLabel?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function FormSubmitButton({
  className,
  disabled = false,
  icon,
  idleLabel,
  pendingLabel = 'İşleniyor',
  variant = 'default',
  size = 'default',
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={isDisabled}
      aria-busy={pending}
      className={cn(className)}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
