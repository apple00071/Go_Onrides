import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Responsive container with proper padding across breakpoints
export function ResponsiveContainer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Responsive grid that adapts columns based on screen size
interface ResponsiveGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: string;
}

export function ResponsiveGrid({
  children,
  columns = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = "gap-4",
  className,
  ...props
}: ResponsiveGridProps) {
  // Map number of columns to Tailwind grid classes
  const getGridCols = (cols: number) => {
    const gridMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };
    return gridMap[cols] || 'grid-cols-1';
  };

  return (
    <div 
      className={cn(
        "grid",
        getGridCols(columns.default),
        columns.sm && `sm:${getGridCols(columns.sm)}`,
        columns.md && `md:${getGridCols(columns.md)}`,
        columns.lg && `lg:${getGridCols(columns.lg)}`,
        columns.xl && `xl:${getGridCols(columns.xl)}`,
        gap,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Two-column layout that stacks on mobile
interface TwoColumnLayoutProps extends HTMLAttributes<HTMLDivElement> {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: string;
  rightWidth?: string;
  stackBelow?: "sm" | "md" | "lg" | "xl";
  reverse?: boolean;
  gap?: string;
}

export function TwoColumnLayout({
  left,
  right,
  leftWidth = "w-full md:w-1/3",
  rightWidth = "w-full md:w-2/3",
  stackBelow = "md",
  reverse = false,
  gap = "gap-4",
  className,
  ...props
}: TwoColumnLayoutProps) {
  const stackClass = `flex-col ${stackBelow}:flex-row`;
  const flexDirection = reverse ? `${stackClass} ${stackBelow}:flex-row-reverse` : stackClass;

  return (
    <div 
      className={cn(
        "flex",
        flexDirection,
        gap,
        className
      )}
      {...props}
    >
      <div className={leftWidth}>
        {left}
      </div>
      <div className={rightWidth}>
        {right}
      </div>
    </div>
  );
}

// Responsive text that changes size based on breakpoint
interface ResponsiveTextProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "h1" | "h2" | "h3" | "h4" | "body" | "small";
}

export function ResponsiveText({
  children,
  variant = "body",
  className,
  ...props
}: ResponsiveTextProps) {
  const variantClasses = {
    h1: "text-2xl sm:text-3xl md:text-4xl font-bold",
    h2: "text-xl sm:text-2xl md:text-3xl font-semibold",
    h3: "text-lg sm:text-xl md:text-2xl font-semibold",
    h4: "text-base sm:text-lg md:text-xl font-medium",
    body: "text-sm sm:text-base",
    small: "text-xs sm:text-sm",
  };

  return (
    <div
      className={cn(
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 