"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          backgroundColor: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          borderColor: "hsl(var(--border))",
        },
        actionButtonStyle: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          border: "1px solid hsl(var(--primary))",
          borderRadius: "0.5rem",
          fontWeight: 600,
          transition: "filter 150ms ease, box-shadow 150ms ease",
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:font-semibold hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-md",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }