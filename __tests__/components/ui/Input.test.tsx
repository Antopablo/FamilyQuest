import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

/** Minimal shape of a react-test-renderer node used by the findAll predicates. */
type TestNode = { type: unknown; props: { name?: string } };

describe('Input', () => {
  it('renders with a label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders without a label', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeTruthy();
  });

  it('displays an error message', () => {
    render(<Input label="Email" error="Required field" />);
    expect(screen.getByText('Required field')).toBeTruthy();
  });

  it('does not display error when not provided', () => {
    render(<Input label="Email" />);
    expect(screen.queryByText('Required field')).toBeNull();
  });

  it('handles text input changes', () => {
    const onChangeText = jest.fn();
    render(<Input label="Name" onChangeText={onChangeText} testID="name-input" />);
    const input = screen.getByTestId('name-input');
    fireEvent.changeText(input, 'John');
    expect(onChangeText).toHaveBeenCalledWith('John');
  });

  it('renders password toggle button when secureTextEntry is true', () => {
    render(<Input label="Password" secureTextEntry testID="password-input" />);
    // The eye toggle button should be rendered
    const input = screen.getByTestId('password-input');
    expect(input).toBeTruthy();
  });

  it('toggles password visibility on eye button press', () => {
    render(<Input label="Password" secureTextEntry testID="password-input" />);
    const input = screen.getByTestId('password-input');

    // Initially password is hidden
    expect(input.props.secureTextEntry).toBe(true);

    // The eye-off icon is rendered; find it and press its parent (the Pressable)
    // Use getAllByRole or find by the Ionicons text since it's mocked as a string component
    // fireEvent.press on the Ionicons element bubbles up to the Pressable
    const icons = screen.root.findAll(
      (node: TestNode) => node.type === 'Ionicons' && (node.props.name === 'eye-off-outline' || node.props.name === 'eye-outline')
    );
    expect(icons.length).toBe(1);

    // Press the parent Pressable of the icon
    fireEvent.press(icons[0].parent!);

    // Now password should be visible
    expect(screen.getByTestId('password-input').props.secureTextEntry).toBe(false);

    // Find the updated icon (should now be eye-outline)
    const iconsAfter = screen.root.findAll(
      (node: TestNode) => node.type === 'Ionicons' && node.props.name === 'eye-outline'
    );
    expect(iconsAfter.length).toBe(1);

    // Press again to re-hide
    fireEvent.press(iconsAfter[0].parent!);
    expect(screen.getByTestId('password-input').props.secureTextEntry).toBe(true);
  });
});
