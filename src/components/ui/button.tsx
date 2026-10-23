import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/components/ui/utils';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-none text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/92',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/92',
        black: 'toss-button toss-button--black',
        brown: 'toss-button toss-button--brown',
        gray: 'toss-button toss-button--gray',
        white: 'toss-button toss-button--white',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/92',
        outline: 'border border-input bg-background hover:border-foreground/20 hover:bg-foreground/10 hover:text-foreground',
        secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-foreground/15',
        ghost: 'hover:bg-foreground/10 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-10 px-3',
        lg: 'h-12 px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
