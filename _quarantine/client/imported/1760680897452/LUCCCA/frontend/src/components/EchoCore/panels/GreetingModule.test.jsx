// GreetingModule.test.jsx
import React from 'react';
import { render } from '@testing-library/react';
import GreetingModule from './GreetingModule';

test('renders greeting', () => {
  const { container } = render(<GreetingModule />);
  expect(container.textContent).toMatch(/Good/);
});
