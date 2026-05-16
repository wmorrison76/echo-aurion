import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function WeatherTrackerSimple({ className, ...rest }: Props) {
  return <div {...rest} className={className}>WeatherTrackerSimple (stub)</div>;
}
