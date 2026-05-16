import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function EnhancedBeoGenerator({ className, ...rest }: Props) {
  return <div {...rest} className={className}>EnhancedBeoGenerator (stub)</div>;
}
