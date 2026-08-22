import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0ea5e9] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#0ea5e9] text-white shadow-sm hover:-translate-y-px hover:bg-[#0284c7] hover:shadow-md",
        destructive: "bg-rose-600 text-white shadow-sm hover:-translate-y-px hover:bg-rose-700 hover:shadow-md",
        outline: "border border-[#cbd5e1] bg-white text-[#475569] shadow-sm hover:border-[#0ea5e9] hover:bg-sky-50 hover:text-[#0284c7]",
        secondary: "bg-[#e8edf4] text-[#020617] hover:bg-[#cbd5e1]",
        ghost: "text-[#475569] hover:bg-sky-50 hover:text-[#0284c7]",
        link: "text-[#0ea5e9] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
