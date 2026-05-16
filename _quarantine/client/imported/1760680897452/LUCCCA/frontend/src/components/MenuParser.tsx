import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function MenuParser({ className, ...rest }: Props) {
  return <div {...rest} className={className}>MenuParser (stub)</div>;
}
