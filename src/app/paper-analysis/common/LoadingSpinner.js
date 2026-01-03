import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export const LoadingSpinner = ({ 
  text = 'Loading...',
  size = 24,
  color = '#e86161',
  className = '',
  textClassName = 'small'
}) => {
  // Handle text prop being either string or array
  const messageArray = Array.isArray(text) ? text : [text];
  
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Handle typing animation
  useEffect(() => {
    if (!isTyping) return;

    let timeoutId;
    const currentMessage = messageArray[currentMessageIndex];
    
    const typeNextChar = (index) => {
      if (index <= currentMessage.length) {
        setDisplayedText(currentMessage.slice(0, index));
        timeoutId = setTimeout(() => typeNextChar(index + 1), 50); // Fixed typing speed
      } else {
        // Finished typing
        if (currentMessageIndex === messageArray.length - 1) {
          // If it's the last message, keep it displayed
          setIsTyping(false);
        }
      }
    };

    typeNextChar(0);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentMessageIndex, isTyping, messageArray]);

  // Handle message cycling
  useEffect(() => {
    if (messageArray.length <= 1) return;
    if (currentMessageIndex === messageArray.length - 1) return; // Stop at last message

    const cycleMessage = () => {
      setIsTyping(false);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1); // Just increment, no modulo
        setDisplayedText('');
        setIsTyping(true);
      }, 100);
    };

    const timeoutId = setTimeout(cycleMessage, 3000); // Fixed delay between messages

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentMessageIndex, messageArray.length, displayedText]);

  return (
    <div className={`text-center py-4 ${className}`}>
      <div className="mb-3">
        <RefreshCw 
          className="spinner-border"
          size={size}
          style={{ 
            color: color,
            animation: 'spin 1s linear infinite'
          }}
        />
      </div>
      <div 
        className={`${textClassName} loading-message`} 
        style={{ 
          color: color,
          minHeight: '1.5em'
        }}
      >
        {displayedText}
        {messageArray.length > 1 && isTyping && (
          <span className="typing-cursor">|</span>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .spinner-border {
          animation: spin 1s linear infinite;
        }
        .typing-cursor {
          animation: blink 1s step-end infinite;
          margin-left: 2px;
        }
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
        .loading-message {
          font-family: monospace;
          white-space: nowrap;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};