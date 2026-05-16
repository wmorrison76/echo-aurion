import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function MenuToBeoGenerator({ className, ...rest }: Props) {
  return <div {...rest} className={className}>MenuToBeoGenerator (stub)</div>;
}
