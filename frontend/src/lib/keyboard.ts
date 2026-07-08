import { useEffect, useRef } from 'react';

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

type UseEscapeKeyOptions = {
  enabled?: boolean;
  allowInInput?: boolean;
  onEscape: () => void;
};

export function useEscapeKey({
  enabled = true,
  allowInInput = false,
  onEscape,
}: UseEscapeKeyOptions) {
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (!allowInInput && isEditableElement(event.target)) return;
      onEscapeRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [allowInInput, enabled]);
}
