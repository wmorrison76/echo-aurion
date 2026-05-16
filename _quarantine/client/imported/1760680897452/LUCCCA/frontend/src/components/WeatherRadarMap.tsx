import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function WeatherRadarMap({ className, ...rest }: Props) {
  return <div {...rest} className={className}>WeatherRadarMap (stub)</div>;
}
