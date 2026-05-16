import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function EnhancedMenuParser({ className, ...rest }: Props) {
  return <div {...rest} className={className}>EnhancedMenuParser (stub)</div>;
}
