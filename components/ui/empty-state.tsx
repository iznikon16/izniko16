import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title?: string;
  description: string;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#cbd5e1] bg-[#e8edf4]/45 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
          {icon}
        </div>
      )}
      {title && <h3 className="mb-1 text-sm font-semibold text-[#020617]">{title}</h3>}
      <p className="text-sm text-[#475569] max-w-sm">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
