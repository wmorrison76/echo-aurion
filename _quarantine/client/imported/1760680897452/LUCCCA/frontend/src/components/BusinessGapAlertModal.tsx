import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function BusinessGapAlertModal({ className, ...rest }: Props) {
  return <div {...rest} className={className}>BusinessGapAlertModal (stub)</div>;
}
