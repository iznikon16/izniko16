import * as React from "react"
import { cn } from "@/lib/utils"

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 pr-8 text-sm text-[#020617] transition-all duration-200 placeholder:text-slate-400 focus-visible:border-[#0ea5e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:bg-[#e8edf4] disabled:opacity-60",
          className
        )}
        ref={ref}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: `right 0.5rem center`,
          backgroundRepeat: `no-repeat`,
          backgroundSize: `1.5em 1.5em`
        }}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
