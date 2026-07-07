import './ActionButton.css';

function ActionButton({ 
  children, 
  variant = 'primary', // 'primary' | 'success' | 'danger' | 'outline' | 'warning'
  onClick, 
  disabled = false,
  size = 'medium', // 'small' | 'medium' | 'large'
  className = '',
  type = 'button',
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'success': return 'btn-success';
      case 'danger': return 'btn-danger';
      case 'warning': return 'btn-warning';
      case 'outline': return 'btn-outline';
      default: return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'btn-sm';
      case 'medium': return 'btn-md';
      case 'large': return 'btn-lg';
      default: return 'btn-md';
    }
  };

  return (
    <button
      type={type}
      className={`action-btn ${getVariantClass()} ${getSizeClass()} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default ActionButton;