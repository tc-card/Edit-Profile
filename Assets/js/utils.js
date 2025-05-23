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
    background: "linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))",
  },
  oceanGradient: {
    background: "linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))",
  },
};
