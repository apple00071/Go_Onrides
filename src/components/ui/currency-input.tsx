'use client';

import { useState, useEffect } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  helperText?: string;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, error, helperText, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
      // Format the value when it changes externally
      const numericValue = parseFloat(value) || 0;
      setDisplayValue(formatCurrency(numericValue));
    }, [value]);

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Extract numeric value from the input
      const rawValue = e.target.value.replace(/[^0-9]/g, '');
      const numericValue = rawValue ? parseInt(rawValue, 10) : 0;

      // Update the display value
      setDisplayValue(formatCurrency(numericValue));

      // Create a synthetic event with the numeric value for the parent component
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: e.target.name,
          value: numericValue.toString()
        }
      };

      onChange(syntheticEvent);
    };

    return (
      <div>
        <div className="relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">₹</span>
          </div>
          <input
            type="text"
            className={cn(
              "block w-full rounded-md pl-7 pr-12 sm:text-sm",
              error 
                ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
              className
            )}
            ref={ref}
            value={displayValue}
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