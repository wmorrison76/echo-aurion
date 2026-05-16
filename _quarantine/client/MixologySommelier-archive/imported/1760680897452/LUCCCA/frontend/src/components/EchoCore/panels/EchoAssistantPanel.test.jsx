import React from 'react';
import { render } from '@testing-library/react';
import EchoAssistantPanel from './EchoAssistantPanel';

test('renders EchoAssistantPanel content', () => {
  const { container } = render(<EchoAssistantPanel />);
  expect(container.textContent).toContain('Echo Assistant');
});
