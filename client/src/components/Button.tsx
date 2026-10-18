import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import { buttonVariants, type ButtonVariantProps } from './button-styles';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

Button.displayName = 'Button';
