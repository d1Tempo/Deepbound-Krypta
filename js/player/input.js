/**
 * js/player/input.js
 * Teclado: setas e W A S D Q E (Shift+setas gira).
 */

// Eventos de Teclado (Setas + WSADQE em teclado QWERTY)
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const activeTag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || (e.target && e.target.isContentEditable)) {
    return;
  }

  const keyLower = (e.key || '').toLowerCase();
  const code = e.code || '';

  const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
  const isWasdqe = ['w', 's', 'a', 'd', 'q', 'e'].includes(keyLower) ||
                   ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE'].includes(code);

  if (isArrow || isWasdqe) {
    e.preventDefault();
  }

  if (e.key === 'ArrowUp' || keyLower === 'w' || code === 'KeyW') {
    moveForwardBackward(1);
  } else if (e.key === 'ArrowDown' || keyLower === 's' || code === 'KeyS') {
    moveForwardBackward(-1);
  } else if (e.key === 'ArrowLeft') {
    if (e.shiftKey) {
      rotatePlayer(-1);
    } else {
      moveStrafe(-1);
    }
  } else if (e.key === 'ArrowRight') {
    if (e.shiftKey) {
      rotatePlayer(1);
    } else {
      moveStrafe(1);
    }
  } else if (keyLower === 'a' || code === 'KeyA') {
    moveStrafe(-1);
  } else if (keyLower === 'd' || code === 'KeyD') {
    moveStrafe(1);
  } else if (keyLower === 'q' || code === 'KeyQ') {
    rotatePlayer(-1);
  } else if (keyLower === 'e' || code === 'KeyE') {
    rotatePlayer(1);
  }
});
