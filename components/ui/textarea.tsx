import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#020617] transition-all duration-200 placeholder:text-slate-400 focus-visible:border-[#0ea5e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:bg-[#e8edf4] disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
