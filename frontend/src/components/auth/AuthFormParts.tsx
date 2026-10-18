// src/components/auth/AuthFormParts.tsx
// Shared building blocks for the auth pages: header, fields with animated errors, password input,
// alert banner and submit button.
'use client'

import { forwardRef, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-danger"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon?: LucideIcon
  error?: string
  hint?: React.ReactNode
  trailing?: React.ReactNode
}

/** Labelled input with optional leading icon, trailing control and an animated error message. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon: Icon, error, hint, trailing, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </Label>
      <div className="group relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand" />
        )}
        <Input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 transition-shadow focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand',
            Icon && 'pl-10',
            trailing && 'pr-11',
            error && 'border-danger focus-visible:ring-danger/25 focus-visible:border-danger',
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
      </div>
      {hint && !error && <div className="text-xs text-muted-foreground">{hint}</div>}
      <FieldError id={errorId} message={error} />
    </div>
  )
})

/** Password field with a show/hide toggle. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'trailing'>>(function PasswordField(
  props,
  ref,
) {
  const [visible, setVisible] = useState(false)
  return (
    <Field
      ref={ref}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  )
})

/** Error banner for problems that aren't tied to one field. Shakes in to draw the eye. */
export function FormAlert({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden"
        >
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function SubmitButton({
  loading,
  loadingText,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={loading || props.disabled}
      className={cn('btn-shine group h-11 w-full bg-brand text-base text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand/90', className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </>
      )}
    </Button>
  )
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
