'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface CustomRadioProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  options: RadioOption[]
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'destructive' | 'success'
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export const CustomRadio: React.FC<CustomRadioProps> = ({
  name,
  value = '',
  onChange,
  options = [],
  disabled = false,
  size = 'md',
  variant = 'default',
  orientation = 'vertical',
  className
}) => {
  const sizeClasses = {
    sm: { radio: 'h-4 w-4', text: 'text-sm', dot: 'h-2 w-2' },
    md: { radio: 'h-5 w-5', text: 'text-base', dot: 'h-2.5 w-2.5' },
    lg: { radio: 'h-6 w-6', text: 'text-lg', dot: 'h-3 w-3' }
  }

  const variantClasses = {
    default: {
      radio: 'border-input data-[state=checked]:border-primary',
      dot: 'bg-primary',
      focus: 'focus:ring-primary/50'
    },
    destructive: {
      radio: 'border-input data-[state=checked]:border-destructive',
      dot: 'bg-destructive',
      focus: 'focus:ring-destructive/50'
    },
    success: {
      radio: 'border-input data-[state=checked]:border-green-600',
      dot: 'bg-green-600',
      focus: 'focus:ring-green-600/50'
    }
  }

  const handleChange = (optionValue: string) => {
    if (!disabled) {
      onChange?.(optionValue)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, optionValue: string) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      handleChange(optionValue)
    }
  }

  return (
    <div
      className={cn(
        'flex gap-4',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
      role="radiogroup"
      aria-disabled={disabled}
    >
      {options.map((option, index) => {
        const isChecked = value === option.value
        const isOptionDisabled = disabled || option.disabled
        const optionId = `${name}-${option.value}`

        return (
          <div key={option.value} className="flex items-start gap-3">
            <div
              className={cn(
                'relative flex items-center justify-center rounded-full border-2 cursor-pointer transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                sizeClasses[size].radio,
                variantClasses[variant].radio,
                variantClasses[variant].focus,
                isOptionDisabled && 'cursor-not-allowed opacity-50',
                isChecked && 'border-primary',
                variant === 'destructive' && isChecked && 'border-destructive',
                variant === 'success' && isChecked && 'border-green-600'
              )}
              onClick={() => !isOptionDisabled && handleChange(option.value)}
              onKeyDown={(e) => !isOptionDisabled && handleKeyDown(e, option.value)}
              tabIndex={isOptionDisabled ? -1 : 0}
              role="radio"
              aria-checked={isChecked}
              aria-disabled={isOptionDisabled}
              aria-labelledby={`${optionId}-label`}
              aria-describedby={option.description ? `${optionId}-description` : undefined}
              data-state={isChecked ? 'checked' : 'unchecked'}
            >
              {isChecked && (
                <div
                  className={cn(
                    'rounded-full transition-all duration-200',
                    sizeClasses[size].dot,
                    variantClasses[variant].dot
                  )}
                />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <label
                id={`${optionId}-label`}
                className={cn(
                  'font-medium leading-none cursor-pointer',
                  sizeClasses[size].text,
                  isOptionDisabled && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => !isOptionDisabled && handleChange(option.value)}
              >
                {option.label}
              </label>
              
              {option.description && (
                <p
                  id={`${optionId}-description`}
                  className={cn(
                    'text-muted-foreground leading-relaxed',
                    size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
                    isOptionDisabled && 'opacity-50'
                  )}
                >
                  {option.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CustomRadio
