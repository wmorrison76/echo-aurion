import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function PipelineDetailsModalFixed({ className, ...rest }: Props) {
  return <div {...rest} className={className}>PipelineDetailsModalFixed (stub)</div>;
}
