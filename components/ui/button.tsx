import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#0ea5e9] text-white hover:bg-[#0284c7] shadow-sm hover:shadow-md hover:-translate-y-[1px]",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md hover:-translate-y-[1px]",
        outline: "border border-gray-200 bg-white hover:border-[#0ea5e9] hover:bg-sky-50 text-gray-700",
        secondary: "bg-[#e8edf4] text-[#020617] hover:bg-[#cbd5e1]",
        ghost: "hover:bg-sky-50 hover:text-[#0ea5e9] text-gray-600",
        link: "text-[#0ea5e9] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-8 text-base",
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
