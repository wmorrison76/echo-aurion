// EchoAssistantPanel.test.jsx
import React from 'react';
import { render } from '@testing-library/react';
import EchoAssistantPanel from './EchoAssistantPanel';

test('renders EchoAssistantPanel content', () => {
  const { container } = render(<EchoAssistantPanel>Content</EchoAssistantPanel>);
  expect(container.textContent).toContain('Content');
});
