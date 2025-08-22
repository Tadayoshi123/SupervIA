'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface CustomSelectProps {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Sélectionner...',
  className,
  disabled = false,
  size = 'md',
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const selectRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  const sizeClasses = {
    sm: 'h-8 text-xs px-2',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4'
  }

  const variantClasses = {
    default: 'border border-input bg-background hover:bg-accent',
    ghost: 'border-0 bg-transparent hover:bg-accent',
    outline: 'border-2 border-input bg-transparent hover:border-primary'
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        // Focus sur l'option sélectionnée quand on ouvre
        const selectedIndex = options.findIndex(option => option.value === value)
        setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0)
      }
    }
  }

  const handleOptionSelect = (option: SelectOption) => {
    if (!option.disabled) {
      onChange?.(option.value)
      setIsOpen(false)
      setFocusedIndex(-1)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(value ? options.findIndex(opt => opt.value === value) : 0)
        } else if (focusedIndex >= 0) {
          handleOptionSelect(options[focusedIndex])
        }
        break

      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(0)
        } else {
          const nextIndex = Math.min(focusedIndex + 1, options.length - 1)
          setFocusedIndex(nextIndex)
          
          // Scroll vers l'option focusée
          if (optionsRef.current) {
            const focusedElement = optionsRef.current.children[nextIndex] as HTMLElement
            focusedElement?.scrollIntoView({ block: 'nearest' })
          }
        }
        break

      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(options.length - 1)
        } else {
          const prevIndex = Math.max(focusedIndex - 1, 0)
          setFocusedIndex(prevIndex)
          
          // Scroll vers l'option focusée
          if (optionsRef.current) {
            const focusedElement = optionsRef.current.children[prevIndex] as HTMLElement
            focusedElement?.scrollIntoView({ block: 'nearest' })
          }
        }
        break

      case 'Escape':
        setIsOpen(false)
        setFocusedIndex(-1)
        break
    }
  }

  return (
    <div className={cn('relative w-full', className)} ref={selectRef}>
      {/* Trigger */}
      <div
        className={cn(
          'flex items-center justify-between rounded-md cursor-pointer transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          sizeClasses[size],
          variantClasses[variant],
          disabled && 'cursor-not-allowed opacity-50',
          isOpen && 'ring-2 ring-ring ring-offset-2'
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={selectedOption?.label || placeholder}
      >
        <span className={cn(
          'flex-1 text-left truncate',
          !selectedOption && 'text-muted-foreground'
        )}>
          {selectedOption?.label || placeholder}
        </span>
        
        <ChevronDown 
          className={cn(
            'h-4 w-4 transition-transform duration-200 text-muted-foreground ml-2',
            isOpen && 'transform rotate-180'
          )}
        />
      </div>

      {/* Options */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1',
            'bg-popover border border-border rounded-md shadow-lg',
            'max-h-60 overflow-auto'
          )}
          ref={optionsRef}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              className={cn(
                'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                focusedIndex === index && 'bg-accent text-accent-foreground',
                option.value === value && 'bg-primary/10 text-primary',
                option.disabled && 'cursor-not-allowed opacity-50'
              )}
              onClick={() => handleOptionSelect(option)}
              role="option"
              aria-selected={option.value === value}
            >
              <span className="flex-1 truncate">{option.label}</span>
              {option.value === value && (
                <Check className="h-4 w-4 text-primary ml-2" />
              )}
            </div>
          ))}
          
          {options.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground text-center">
              Aucune option disponible
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
