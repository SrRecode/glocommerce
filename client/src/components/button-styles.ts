import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-hover',
        secondary: 'border border-line bg-surface text-ink hover:bg-surface-sunken',
        ghost: 'text-graphite hover:bg-surface-sunken hover:text-ink',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3 text-body-sm',
        md: 'h-11 px-5 text-body-sm',
        lg: 'h-12 px-6 text-body',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
