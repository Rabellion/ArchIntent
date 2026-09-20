import React from 'react';

interface FormButtonProps {
  loading: boolean;
  label: string;
  disabled?: boolean;
  className?: string;
}

export const FormSubmitButton: React.FC<FormButtonProps> = ({
  loading,
  label,
  disabled = false,
  className = 'w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-200',
}) => {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`${className} flex items-center justify-center gap-2`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {label}...
        </>
      ) : (
        label
      )}
    </button>
  );
};

export default FormSubmitButton;
