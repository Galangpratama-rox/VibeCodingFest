import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      icons={{
        success: (
          <CircleCheckIcon className="size-5" />
        ),
        info: (
          <InfoIcon className="size-5" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5" />
        ),
        error: (
          <OctagonXIcon className="size-5" />
        ),
        loading: (
          <Loader2Icon className="size-5 animate-spin" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-300 group-[.toaster]:shadow-[0_20px_50px_rgba(0,0,0,0.2)] group-[.toaster]:rounded-2xl group-[.toaster]:font-sans group-[.toaster]:p-5 group-[.toaster]:border-2 group-[.toaster]:scale-105 sm:group-[.toaster]:scale-100",
          description: "group-[.toast]:text-slate-500 group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-teal-600 group-[.toast]:text-white group-[.toast]:font-bold",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500",
          success: "group-[.toaster]:bg-white group-[.toaster]:text-teal-900 group-[.toaster]:border-teal-500",
          error: "group-[.toaster]:bg-white group-[.toaster]:text-red-900 group-[.toaster]:border-red-500",
          warning: "group-[.toaster]:bg-white group-[.toaster]:text-orange-900 group-[.toaster]:border-orange-500",
          info: "group-[.toaster]:bg-white group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
