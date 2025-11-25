import { forwardRef } from 'react'

export function Section({
  title,
  children,
}: {
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[2px] uppercase text-muted mb-2">
        {title}
      </div>
      {children}
    </div>
  )
}

const inputBase =
  'w-full bg-bg border border-border text-text px-3 py-2 rounded-md text-xs ' +
  'font-mono outline-none transition-colors focus:border-accent'

export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      className={`${inputBase} ${className}`}
      {...props}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`${inputBase} ${className} appearance-none cursor-pointer`}
      {...props}
    >
      {children}
    </select>
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`${inputBase} ${className} resize-y min-h-[100px] leading-relaxed`}
      {...props}
    />
  )
})

type ButtonVariant = 'primary' | 'secondary' | 'green' | 'danger'

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-accent to-accent-strong text-white ' +
    'shadow-[0_0_18px_rgba(108,99,255,0.3)] ' +
    'hover:shadow-[0_0_28px_rgba(108,99,255,0.55)] hover:-translate-y-px',
  secondary: 'bg-border text-text hover:bg-border-strong',
  green:
    'bg-green/10 text-green border border-green/30 hover:bg-green/20',
  danger:
    'bg-red/10 text-red border border-red/25 hover:bg-red/25',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}) {
  return (
    <button
      className={
        'w-full px-3.5 py-2 rounded-md font-mono text-xs font-medium tracking-wide ' +
        'transition-all duration-200 cursor-pointer ' +
        'disabled:opacity-50 disabled:cursor-wait disabled:translate-y-0 ' +
        buttonStyles[variant] +
        ' ' +
        className
      }
      {...props}
    >
      {children}
    </button>
  )
}
