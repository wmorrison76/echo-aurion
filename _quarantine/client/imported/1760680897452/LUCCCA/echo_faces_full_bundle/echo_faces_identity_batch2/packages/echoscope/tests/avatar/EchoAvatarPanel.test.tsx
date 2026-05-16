import { render } from '@testing-library/react';
import { EchoAvatarPanel } from '../../src/panes/EchoAvatar/EchoAvatarPanel';

test('renders EchoAvatarPanel', () => {
  const { getByText } = render(<EchoAvatarPanel />);
  expect(getByText('Choose Avatar')).toBeInTheDocument();
});
