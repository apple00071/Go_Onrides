import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
  helperText?: string;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div>
        <div className="relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">₹</span>
          </div>
          <input
            type="number"
            className={cn(
              "block w-full rounded-md pl-7 pr-12 sm:text-sm",
              error 
                ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
              className
            )}
            ref={ref}
            step="0.01"
            min="0"
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