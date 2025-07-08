'use client';

import React, { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { IndianRupee } from 'lucide-react';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  error?: boolean;
  helperText?: string;
  hideSymbol?: boolean;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, error, helperText, value, onChange, hideSymbol = false, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      // Remove any non-numeric characters except decimal point
      const numericValue = value.replace(/[^\d.]/g, '');
      
      // Ensure only one decimal point
      const parts = numericValue.split('.');
      if (parts.length > 2) {
        return;
      }
      
      // Create a new event with the processed value
      const newEvent = {
        ...event,
        target: {
          ...event.target,
          value: numericValue
        }
      };
      
      onChange(newEvent);
    };

    return (
      <div>
        <div className="relative rounded-md shadow-sm">
          {!hideSymbol && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <IndianRupee className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <input
            type="text"
            className={cn(
              "block w-full rounded-md",
              !hideSymbol ? "pl-7" : "pl-3",
              "pr-12 sm:text-sm",
              error 
                ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
              className
            )}
            ref={ref}
            value={value}
            onChange={handleChange}
            {...props}
          />
        </div>
        {helperText && (
          <p className={cn(
            "mt-1 text-sm",
            error ? "text-red-600" : "text-gray-500"
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput }; 