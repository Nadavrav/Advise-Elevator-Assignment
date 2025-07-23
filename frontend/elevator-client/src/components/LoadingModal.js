import React from 'react';
import styles from './LoadingModal.module.css';

function LoadingModal() {
  return (
    <div className={styles.overlay}>
      <div className={styles.spinner}></div>
      <p>Loading...</p>
    </div>
  );
}

export default LoadingModal;