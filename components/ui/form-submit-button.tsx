'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from './button';

type FormSubmitButtonProps = {
  className?: string;
  disabled?: boolean;
  formAction?: ButtonHTMLAttributes<HTMLButtonElement>['formAction'];
  icon?: ReactNode;
  idleLabel: string;
  pendingLabel?: string;
  successMessage?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function FormSubmitButton({
  className,
  disabled = false,
  formAction,
  icon,
  idleLabel,
  pendingLabel = 'İşleniyor',
  successMessage,
  variant = 'default',
  size = 'default',
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  const clickedRef = useRef(false);
  const observedPendingRef = useRef(false);

  useEffect(() => {
    if (pending && clickedRef.current) {
      observedPendingRef.current = true;
      return;
    }

    if (!pending && clickedRef.current && observedPendingRef.current) {
      toast.success(successMessage ?? `${idleLabel} işlemi başarıyla tamamlandı.`);
      clickedRef.current = false;
      observedPendingRef.current = false;
    }
  }, [idleLabel, pending, successMessage]);

  return (
    <Button
      type="submit"
      formAction={formAction}
      variant={variant}
      size={size}
      disabled={isDisabled}
      aria-busy={pending}
      onClick={() => {
        clickedRef.current = true;
      }}
      className={cn(className)}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
