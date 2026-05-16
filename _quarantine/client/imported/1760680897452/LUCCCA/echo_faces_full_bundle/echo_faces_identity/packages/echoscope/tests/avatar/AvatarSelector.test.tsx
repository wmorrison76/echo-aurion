import { render } from '@testing-library/react';
import { AvatarSelector } from '../../src/components/avatar/AvatarSelector';

test('renders avatar selector', () => {
  const { getByText } = render(<AvatarSelector />);
  expect(getByText('Choose Avatar')).toBeInTheDocument();
});
