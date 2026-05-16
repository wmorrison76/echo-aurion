import React from 'react';
type Props = { className?: string } & React.HTMLAttributes<HTMLDivElement>;
export default function EventsCalendarModal({ className, ...rest }: Props) {
  return <div {...rest} className={className}>EventsCalendarModal (stub)</div>;
}
