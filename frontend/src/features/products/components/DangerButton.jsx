// frontend/src/features/products/components/DangerButton.jsx

export default function DangerButton({ children, size, className = "", ...props }) {
  const sm = size === "sm";
  return (
    <button
      type="button"
      className={`danger-btn ${sm ? "sm" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
