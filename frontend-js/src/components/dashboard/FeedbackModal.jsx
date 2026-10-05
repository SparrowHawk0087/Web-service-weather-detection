import { useEffect, useRef } from 'react';
import { useState } from 'react';

export default function FeedbackModal({ isOpen, onClose, file }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  // file preview
  useEffect(() => {
    if (!isOpen || !file) {
      setPreview(null);
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [isOpen, file]);

  // close hotkey Esc + block scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    // focus on textarea while opening
    textareaRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      // TODO: add API endpoint
      console.log('>>> feedback submitted:', {
        file: file?.name,
        text: text.trim(),
      });
      setText('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // overlay click - close, card click - don't close 
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-purple-400/40 bg-[#12131b] p-6 shadow-[0_0_60px_rgba(168,85,247,0.4)]">
        {/* close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* header */}
        <h2 className="text-2xl font-semibold text-white text-center mb-6">
          Report an Issue
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* preview of pic or placeholder */}
          <div className="w-full aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="user upload"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-white/40 text-sm">User image</span>
            )}
          </div>

          {/* problems description */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what the model did wrong"
            rows={3}
            className="w-full resize-none rounded-2xl bg-white/5 border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
          />

          {/* send button */}
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="w-full py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <span>{submitting ? 'Sending...' : 'Send'}</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}