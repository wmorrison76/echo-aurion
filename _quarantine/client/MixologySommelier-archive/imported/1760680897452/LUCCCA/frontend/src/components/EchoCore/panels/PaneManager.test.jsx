// PaneManager.test.jsx
import React from 'react';
import { render } from '@testing-library/react';
import PaneManager from './PaneManager';

test('renders PaneManager with a pane', () => {
  const { getByText } = render(
    <PaneManager initialPanes={[{ x: 0, y: 0, width: 100, height: 100, content: 'Pane' }]} />
  );
  expect(getByText('Pane')).toBeInTheDocument();
});
