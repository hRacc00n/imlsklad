import './ModalCloseButton.css';

function ModalCloseButton({ onClick }) {
  return (
    <button className="modal-close-btn" onClick={onClick}>
      ✕
    </button>
  );
}

export default ModalCloseButton;