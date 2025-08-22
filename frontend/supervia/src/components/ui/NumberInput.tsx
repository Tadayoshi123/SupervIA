'use client'

import React, { useState, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: number | string
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  showControls?: boolean
  className?: string
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value = '',
  onChange,
  min,
  max,
  step = 1,
  showControls = true,
  className,
  disabled,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState<string>(String(value))

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setInternalValue(inputValue)

    // Parse la valeur et appelle onChange si c'est un nombre valide
    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue) && onChange) {
      onChange(numValue)
    }
  }, [onChange])

  const handleIncrement = useCallback(() => {
    if (disabled) return
    
    const currentValue = parseFloat(internalValue) || 0
    const newValue = currentValue + step
    
    // Vérifie les limites
    if (max !== undefined && newValue > max) return
    
    const finalValue = max !== undefined ? Math.min(newValue, max) : newValue
    setInternalValue(String(finalValue))
    
    if (onChange) {
      onChange(finalValue)
    }
  }, [internalValue, step, max, disabled, onChange])

  const handleDecrement = useCallback(() => {
    if (disabled) return
    
    const currentValue = parseFloat(internalValue) || 0
    const newValue = currentValue - step
    
    // Vérifie les limites
    if (min !== undefined && newValue < min) return
    
    const finalValue = min !== undefined ? Math.max(newValue, min) : newValue
    setInternalValue(String(finalValue))
    
    if (onChange) {
      onChange(finalValue)
    }
  }, [internalValue, step, min, disabled, onChange])

  // Synchronise la valeur interne avec la prop value
  React.useEffect(() => {
    setInternalValue(String(value))
  }, [value])

  return (
    <div className={cn('number-input-wrapper', className)}>
      <input
        {...props}
        type="number"
        value={internalValue}
        onChange={handleInputChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          showControls && 'pr-8'
        )}
      />
      
      {showControls && !disabled && (
        <div className="number-input-controls">
          <button
            type="button"
            className="number-input-btn"
            onClick={handleIncrement}
            tabIndex={-1}
            aria-label="Incrémenter"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="number-input-btn"
            onClick={handleDecrement}
            tabIndex={-1}
            aria-label="Décrémenter"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export default NumberInput
