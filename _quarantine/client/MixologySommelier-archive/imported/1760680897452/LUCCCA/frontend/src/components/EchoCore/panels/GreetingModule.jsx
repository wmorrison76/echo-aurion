/**
 * LUCCCA | DB-03
 * Time-of-day aware greeting module.
 */
import React from 'react';

const GreetingModule = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  return <div className="text-lg font-semibold">{greeting}, Chef!</div>;
};

export default GreetingModule;
