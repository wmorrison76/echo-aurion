import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function EventDetailModal({ className, ...rest }: Props) {
  return <div {...rest} className={className}>EventDetailModal (stub)</div>;
}
