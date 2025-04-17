// Copied and adapted from shadcn/ui toast component
// https://ui.shadcn.com/docs/components/toast

import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

export function useToast() {
  return {
    toast: ({ title, description, variant, action }: ToastProps) => {
      const options = {
        className: variant === "destructive" ? "bg-destructive text-destructive-foreground" : undefined,
        description,
        action,
      }
      
      return sonnerToast(title, options)
    },
    dismiss: sonnerToast.dismiss,
    error: sonnerToast.error,
    success: sonnerToast.success,
    loading: sonnerToast.loading,
    promise: sonnerToast.promise,
  }
} 