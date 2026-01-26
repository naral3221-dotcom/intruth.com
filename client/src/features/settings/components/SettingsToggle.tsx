import { motion } from 'framer-motion';

interface SettingsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function SettingsToggle({
  enabled,
  onChange,
  size = 'md',
  disabled = false,
}: SettingsToggleProps) {
  const sizes = {
    sm: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    md: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
  };

  const currentSize = sizes[size];

  return (
    <motion.button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative inline-flex items-center rounded-full p-0.5 transition-colors duration-300
        ${currentSize.track}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${enabled
          ? 'bg-linear-to-r from-neon-violet to-neon-teal'
          : 'bg-white/10 hover:bg-white/20'
        }
      `}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      aria-pressed={enabled}
      disabled={disabled}
    >
      {/* Glow effect */}
      {enabled && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          style={{
            background: 'radial-gradient(circle, rgba(224, 64, 251, 0.4) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />
      )}

      {/* Thumb */}
      <motion.span
        className={`
          ${currentSize.thumb}
          rounded-full bg-white shadow-lg
          flex items-center justify-center
        `}
        animate={{
          x: enabled ? parseInt(currentSize.translate.split('-x-')[1]) * 4 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {/* Inner glow on enabled */}
        {enabled && (
          <motion.span
            className="absolute inset-0 rounded-full bg-linear-to-br from-white to-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
      </motion.span>
    </motion.button>
  );
}

interface SettingsSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}

export function SettingsSelect<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
}: SettingsSelectProps<T>) {
  return (
    <motion.div
      className="relative"
      whileHover={{ scale: disabled ? 1 : 1.02 }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className={`
          appearance-none px-4 py-2 pr-10 rounded-xl
          bg-white/5 border border-white/10 text-white
          focus:outline-none focus:border-neon-violet/50
          transition-colors cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-slate-900 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </motion.div>
  );
}

interface SettingsButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function SettingsButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}: SettingsButtonProps) {
  const variants = {
    primary: 'bg-linear-to-r from-neon-violet to-neon-teal text-white',
    secondary: 'bg-white/10 text-white hover:bg-white/20',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-xl font-medium transition-colors
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}

interface SettingsInputProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  disabled?: boolean;
}

export function SettingsInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
}: SettingsInputProps) {
  return (
    <motion.input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-4 py-2 rounded-xl
        bg-white/5 border border-white/10 text-white
        placeholder-gray-500
        focus:outline-none focus:border-neon-violet/50
        transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      whileFocus={{ scale: 1.01 }}
    />
  );
}
