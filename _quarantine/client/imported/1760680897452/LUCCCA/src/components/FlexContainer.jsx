import React from 'react';

export function FlexContainer({ children, justify = 'between' }) {
  return (
    <div className={`flex justify-${justify} items-center`}>
      {children}
    </div>
  );
}
