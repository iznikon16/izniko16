import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0ea5e9] text-white hover:bg-[#0284c7]",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
        outline: "text-gray-950",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-600",
        info:
          "border-sky-500/20 bg-sky-500/10 text-sky-500",
        muted:
          "border-gray-200 bg-gray-50 text-gray-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
