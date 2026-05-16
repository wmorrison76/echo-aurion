import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function MenuPerformanceReport({ className, ...rest }: Props) {
  return <div {...rest} className={className}>MenuPerformanceReport (stub)</div>;
}
