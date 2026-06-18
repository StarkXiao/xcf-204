import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const InputField = ({ label, ...props }: InputProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
    />
  </div>
);

export const SelectField = ({ label, options, ...props }: SelectProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</label>
    <select
      {...props}
      className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const TextareaField = ({ label, ...props }: TextareaProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</label>
    <textarea
      {...props}
      className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
      rows={4}
    />
  </div>
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'danger' | 'secondary';
  size?: 'sm' | 'md';
}) => {
  const variants = {
    primary: 'bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white shadow-lg shadow-[var(--accent-glow)]',
    danger: 'bg-[var(--danger)] hover:bg-red-600 text-white',
    secondary: 'bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-white border border-[var(--border)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3',
  };

  return (
    <button
      {...props}
      className={`${sizes[size]} rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {children}
    </button>
  );
};
