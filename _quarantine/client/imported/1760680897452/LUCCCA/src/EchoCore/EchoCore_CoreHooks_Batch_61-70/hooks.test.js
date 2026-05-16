// hooks.test.js
import { renderHook, act } from '@testing-library/react';
import useNotificationHook from './useNotificationHook';

test('adds and removes notifications', () => {
  const { result } = renderHook(() => useNotificationHook());
  act(() => result.current.addNotification('Test message'));
  expect(result.current.notifications.length).toBe(1);
  const id = result.current.notifications[0].id;
  act(() => result.current.removeNotification(id));
  expect(result.current.notifications.length).toBe(0);
});
