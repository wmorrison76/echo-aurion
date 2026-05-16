import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function WeatherNotificationPopup({ className, ...rest }: Props) {
  return <div {...rest} className={className}>WeatherNotificationPopup (stub)</div>;
}
