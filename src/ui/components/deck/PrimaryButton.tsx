// Built with help from Claude (Anthropic).
// PrimaryButton (LUNA_BUILD A2.3): amber fill, dark text, mono uppercase label, an arrow.
// At least 56 px tall. `secondary` is outline only.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  secondary?: boolean;
  /** Hide the arrow (for example on "Back" buttons). */
  noArrow?: boolean;
  /** A key hint shown inside the button, e.g. "Space". */
  hint?: string;
  children: ReactNode;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(function PrimaryButton(
  { secondary = false, noArrow = false, hint, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={`${secondary ? 'btn-secondary' : 'btn-primary'} ${className}`} {...rest}>
      <span>{children}</span>
      {hint && <kbd className="key">{hint}</kbd>}
      {!noArrow && (
        <svg aria-hidden viewBox="0 0 20 12" className="h-3 w-5 shrink-0">
          <path d="M0 6 H17 M12 1 L18 6 L12 11" fill="none" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      )}
    </button>
  );
});
