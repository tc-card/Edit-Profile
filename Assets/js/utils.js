export async function showAlert(icon, title, html) {
  return Swal.fire({
    icon,
    title,
    html,
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#7c3aed'
  });
}

export function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

export function debounce(fn, delay) {
  let timer;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(context, args);
    }, delay);
  };
}

export const styles = {
  corporateGradient: {
    background: "background:linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))",
  },
  oceanGradient: {
    background: "background:linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))",
  },
};

// --- NEW UTILITY: Custom Draggable Links (Fully Vanilla JS) ---
export function initDraggableLinks(container, onReorderCallback) {
  if (!container) return;

  let draggedItem = null;
  let ghostElement = null;
  let placeholder = null;

  const createPlaceholder = () => {
    const pl = document.createElement('div');
    pl.className = 'social-link-item';
    pl.style.cssText = `
      opacity: 0.3;
      background-color: rgba(139, 92, 246, 0.2);
      border: 2px dashed #7c3aed;
      border-radius: 12px;
      height: ${draggedItem.offsetHeight}px;
      width: 100%;
      pointer-events: none;
    `;
    return pl;
  };

  const onDragStart = (e) => {
    const handle = e.target.closest('.handle');
    if (!handle) return;
    
    draggedItem = handle.closest('.social-link-item');
    if (!draggedItem) return;
    
    // Crucial: stops mobile browsers from scrolling while dragging
    e.preventDefault();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;

    // Create the floating ghost element
    ghostElement = draggedItem.cloneNode(true);
    ghostElement.style.cssText = `
      position: fixed;
      left: ${clientX - draggedItem.offsetWidth / 2}px;
      top: ${clientY - draggedItem.offsetHeight / 2}px;
      width: ${draggedItem.offsetWidth}px;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.85;
      transform: scale(1.02) rotate(1deg);
      background-color: rgba(55, 65, 81, 0.95);
      border-radius: 12px;
      padding: 0.5rem 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      transition: none;
    `;
    document.body.appendChild(ghostElement);

    // Insert a placeholder where the original item sits
    placeholder = createPlaceholder();
    draggedItem.parentNode.insertBefore(placeholder, draggedItem);
    draggedItem.style.display = 'none';

    // Bind move and end listeners
    if (e.type === 'mousedown') {
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    } else if (e.type === 'touchstart') {
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('touchend', onDragEnd);
    }
  };

  const onDragMove = (e) => {
    e.preventDefault(); // Stops scrolling on mobile
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (ghostElement && clientX && clientY) {
      ghostElement.style.left = `${clientX - draggedItem.offsetWidth / 2}px`;
      ghostElement.style.top = `${clientY - draggedItem.offsetHeight / 2}px`;
    }
    if (!clientX || !clientY) return;

    // Find what element is currently under the cursor
    const elementBelow = document.elementFromPoint(clientX, clientY);
    if (!elementBelow) return;
    
    const targetItem = elementBelow.closest('.social-link-item');
    
    if (targetItem && targetItem !== placeholder && targetItem !== draggedItem) {
      const parent = targetItem.parentNode;
      parent.insertBefore(placeholder, targetItem);
    }
  };

  const onDragEnd = () => {
    if (placeholder && draggedItem) {
      draggedItem.style.display = 'flex'; // Show original item
      placeholder.parentNode.replaceChild(draggedItem, placeholder); // Swap back
    }

    if (ghostElement) {
      ghostElement.remove();
      ghostElement = null;
    }

    // Clean up listeners
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);

    if (draggedItem) {
      if (typeof onReorderCallback === 'function') onReorderCallback();
      draggedItem = null;
    }
  };

  // Attach the start events to the parent container
  container.addEventListener('mousedown', onDragStart);
  container.addEventListener('touchstart', onDragStart, { passive: false });
}