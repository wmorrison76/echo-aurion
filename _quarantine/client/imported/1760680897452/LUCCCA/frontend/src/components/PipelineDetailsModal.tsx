import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function PipelineDetailsModal({ className, ...rest }: Props) {
  return <div {...rest} className={className}>PipelineDetailsModal (stub)</div>;
}
