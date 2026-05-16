import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TextureControlsPanel } from '../src/TextureControlsPanel';

test('slider emits precision-clamped values', () => {
  const spy = jest.fn();
  const { getByLabelText } = render(<TextureControlsPanel onIntensityChange={spy} />);
  const slider = getByLabelText('Texture Intensity') as HTMLInputElement;
  fireEvent.change(slider, { target: { value: '0.1234567' } });
  expect(spy).toHaveBeenCalled();
  const v = spy.mock.calls[0][0];
  // value should be clamped to 5 decimals
  expect(v).toBeCloseTo(0.12346, 5);
});
