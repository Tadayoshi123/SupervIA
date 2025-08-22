'use client'

import React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomCheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'destructive' | 'success'
  className?: string
  id?: string
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  variant = 'default',
  className,
  id
}) => {
  const sizeClasses = {
    sm: { checkbox: 'h-4 w-4', text: 'text-sm', icon: 'h-3 w-3' },
    md: { checkbox: 'h-5 w-5', text: 'text-base', icon: 'h-4 w-4' },
    lg: { checkbox: 'h-6 w-6', text: 'text-lg', icon: 'h-5 w-5' }
  }

  const variantClasses = {
    default: {
      checkbox: 'border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary',
      focus: 'focus:ring-primary/50'
    },
    destructive: {
      checkbox: 'border-input data-[state=checked]:bg-destructive data-[state=checked]:border-destructive',
      focus: 'focus:ring-destructive/50'
    },
    success: {
      checkbox: 'border-input data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600',
      focus: 'focus:ring-green-600/50'
    }
  }

  const handleChange = () => {
    if (!disabled) {
      onChange?.(!checked)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      handleChange()
    }
  }

  const state = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded border-2 cursor-pointer transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          sizeClasses[size].checkbox,
          variantClasses[variant].checkbox,
          variantClasses[variant].focus,
          disabled && 'cursor-not-allowed opacity-50',
          (checked || indeterminate) && 'bg-primary border-primary text-white',
          variant === 'destructive' && (checked || indeterminate) && 'bg-destructive border-destructive',
          variant === 'success' && (checked || indeterminate) && 'bg-green-600 border-green-600'
        )}
        onClick={handleChange}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-disabled={disabled}
        aria-labelledby={label && id ? `${id}-label` : undefined}
        aria-describedby={description && id ? `${id}-description` : undefined}
        data-state={state}
      >
        {indeterminate ? (
          <Minus className={cn(sizeClasses[size].icon, 'text-white')} />
        ) : checked ? (
          <Check className={cn(sizeClasses[size].icon, 'text-white')} />
        ) : null}
      </div>

      {(label || description) && (
        <div className="flex-1 space-y-1">
          {label && (
            <label
              id={id ? `${id}-label` : undefined}
              className={cn(
                'font-medium leading-none cursor-pointer',
                sizeClasses[size].text,
                disabled && 'cursor-not-allowed opacity-50'
              )}
              onClick={!disabled ? handleChange : undefined}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              id={id ? `${id}-description` : undefined}
              className={cn(
                'text-muted-foreground leading-relaxed',
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
                disabled && 'opacity-50'
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomCheckbox
