import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function SmartInput({ className, ...rest }: Props) {
  return <div {...rest} className={className}>SmartInput (stub)</div>;
}
