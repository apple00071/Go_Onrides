import { ReactNode, HTMLAttributes } from 'react';

interface ResponsiveTableProps extends HTMLAttributes<HTMLDivElement> {
  headers: string[];
  children: ReactNode;
  stickyHeader?: boolean;
}

export function ResponsiveTable({
  headers,
  children,
  stickyHeader = false,
  className,
  ...props
}: ResponsiveTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white" {...props}>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {headers.map((header, index) => (
                <th 
                  key={index} 
                  scope="col" 
                  className="whitespace-nowrap px-6 py-3 text-left"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {header}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ResponsiveCardListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ResponsiveCardList({ children, className, ...props }: ResponsiveCardListProps) {
  return (
    <div className="md:hidden w-full" {...props}>
      <div className="grid gap-4">
        {children}
      </div>
    </div>
  );
}

interface ResponsiveCardProps extends HTMLAttributes<HTMLDivElement> {
  data: { label: string; value: ReactNode }[];
  onClick?: () => void;
}

export function ResponsiveCard({ data, onClick, className, ...props }: ResponsiveCardProps) {
  return (
    <div 
      className={`
        bg-white rounded-lg border border-gray-200 p-4 space-y-3
        ${onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      {...props}
    >
      {data.map((item, index) => (
        <div key={index} className="flex justify-between">
          <span className="text-sm font-medium text-gray-500">{item.label}</span>
          <div className="text-sm text-gray-900 text-right ml-2">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ResponsiveTableWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="hidden md:block">
        {children}
      </div>
    </>
  );
} 