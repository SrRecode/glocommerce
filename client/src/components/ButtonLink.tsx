import { Link, type LinkProps } from 'react-router';

import { cn } from '@/lib/utils';

import { buttonVariants, type ButtonVariantProps } from './button-styles';

export type ButtonLinkProps = LinkProps & ButtonVariantProps;

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
