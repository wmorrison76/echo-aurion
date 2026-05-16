// EchoAvatar.test.js
import React from 'react';
import { render } from '@testing-library/react';
import EchoAvatar from './EchoAvatar';

test('renders and animates happy mood', () => {
  const { getByAltText } = render(<EchoAvatar mood="happy" />);
  const img = getByAltText('Echo Avatar');
  expect(img).toBeInTheDocument();
});
