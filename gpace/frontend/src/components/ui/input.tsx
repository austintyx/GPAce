import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, ...props }) => {
  return (
    <div className="flex flex-col">
      {label && <label className="mb-1 text-sm font-medium text-slate-700">{label}</label>}
      <input
        className="border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        {...props}
      />
    </div>
  );
};

export default Input;