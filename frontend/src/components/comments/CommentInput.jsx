import { useState, useRef } from 'react';
import ActionButton from '../common/ActionButton';
import './CommentInput.css';

function CommentInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="comment-input-wrap">
      <textarea
        ref={textareaRef}
        className="comment-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Написать комментарий..."
        rows={2}
        disabled={disabled}
      />
      <ActionButton
        variant="primary"
        size="medium"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
      >
        Отправить
      </ActionButton>
    </div>
  );
}

export default CommentInput;