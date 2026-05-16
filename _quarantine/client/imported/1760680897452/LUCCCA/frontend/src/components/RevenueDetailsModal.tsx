import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function RevenueDetailsModal({ className, ...rest }: Props) {
  return <div {...rest} className={className}>RevenueDetailsModal (stub)</div>;
}
