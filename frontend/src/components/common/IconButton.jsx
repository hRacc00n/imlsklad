import './IconButton.css';

function IconButton({ 
  icon, 
  onClick, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  type = 'button',
  ariaLabel = '',
  title = '',
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'icon-btn-primary';
      case 'success': return 'icon-btn-success';
      case 'danger': return 'icon-btn-danger';
      case 'outline': return 'icon-btn-outline';
      case 'ghost': return 'icon-btn-ghost';
      default: return 'icon-btn-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'icon-btn-sm';
      case 'medium': return 'icon-btn-md';
      case 'large': return 'icon-btn-lg';
      default: return 'icon-btn-md';
    }
  };

  return (
    <button
      type={type}
      className={`icon-btn ${getVariantClass()} ${getSizeClass()} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || title}
      title={title}
    >
      {icon}
    </button>
  );
}

export default IconButton;