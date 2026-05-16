import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function WeatherTracker({ className, ...rest }: Props) {
  return <div {...rest} className={className}>WeatherTracker (stub)</div>;
}
