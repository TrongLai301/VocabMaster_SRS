import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Chọn một mục...',
  className,
  dropdownClassName,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Đóng khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative w-full select-none', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background/80 backdrop-blur-xs px-3.5 py-2 text-sm text-foreground shadow-xs transition-all duration-150',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30',
          isOpen && 'border-primary ring-2 ring-primary/30 shadow-md',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0 flex items-center justify-center text-primary">
                  {selectedOption.icon}
                </span>
              )}
              <span className="truncate font-medium">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 sm:max-h-80 overflow-y-auto rounded-xl border border-border/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150',
            dropdownClassName
          )}
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-foreground hover:bg-muted/80'
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {option.icon && (
                      <span
                        className={cn(
                          'shrink-0 flex items-center justify-center',
                          isSelected ? 'text-primary-foreground' : 'text-primary'
                        )}
                      >
                        {option.icon}
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-mono',
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
