import React, {
  forwardRef, memo,
} from 'react';
import styles from './CustomTabHeader.module.css'; // Import CSS module

const CustomTabHeader = forwardRef(({
  api, title, className, closeHandler, style, showProgress = true,
}, ref) => (
  <div
    ref={ref}
    className={`${styles.tabContainer} ${className || ''}`}
    onClick={() => api.setActive()}
    style={style}
  >
    {/* Tab Title */}
    <span className={styles.tabTitle}>
      {title}
    </span>

    {/* Close Button (SVG X) */}
    <button
      className={styles.closeButton}
      onClick={(e) => {
        e.stopPropagation(); // Prevent tab switch on close click
        if (closeHandler) {
          closeHandler(api.id); // Pass tab ID to custom close handler
        } else {
          api.close(); // Default close if no handler is provided
        }
      }}
    >
      ✕
    </button>
    {/* Progress Bar at the Bottom */}
    {showProgress && (
    <div className={styles.progressWrapper}>
      <div className={styles.progressBar} />
    </div>
    )}
  </div>
));

export default memo(CustomTabHeader);
