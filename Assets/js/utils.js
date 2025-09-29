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

export function getLinkIcon(url) {
  if (!url) return 'fas fa-link';

  // Map of domains to Font Awesome icons (extended and more universal)
  const platformIcons = {
    'facebook.com': 'fab fa-facebook',
    'fb.com': 'fab fa-facebook',
    'fb.me': 'fab fa-facebook',
    'messenger.com': 'fab fa-facebook-messenger',
    'm.me': 'fab fa-facebook-messenger',
    'twitter.com': 'fab fa-twitter',
    'x.com': 'fab fa-x-twitter',
    'instagram.com': 'fab fa-instagram',
    'linkedin.com': 'fab fa-linkedin',
    'youtube.com': 'fab fa-youtube',
    'youtube-nocookie.com': 'fab fa-youtube',
    'tiktok.com': 'fab fa-tiktok',
    'pinterest.com': 'fab fa-pinterest',
    'snapchat.com': 'fab fa-snapchat',
    'reddit.com': 'fab fa-reddit',
    'discord.com': 'fab fa-discord',
    'discord.gg': 'fab fa-discord',
    'twitch.tv': 'fab fa-twitch',
    'github.com': 'fab fa-github',
    'github.io': 'fab fa-github',
    'cal.com': 'fas fa-calendar-alt',
    'calendly.com': 'fas fa-calendar-alt',
    'linktree.com': 'fas fa-link',
    'linktr.ee': 'fas fa-link',
    'tccards.tn': 'fas fa-id-card',
    'medium.com': 'fab fa-medium',
    'whatsapp.com': 'fab fa-whatsapp',
    'wa.me': 'fab fa-whatsapp',
    'dribbble.com': 'fab fa-dribbble',
    'behance.net': 'fab fa-behance',
    'telegram.org': 'fab fa-telegram',
    't.me': 'fab fa-telegram',
    'vimeo.com': 'fab fa-vimeo',
    'spotify.com': 'fab fa-spotify',
    'apple.com': 'fab fa-apple',
    'google.com': 'fab fa-google',
    'soundcloud.com': 'fab fa-soundcloud',
    'paypal.com': 'fab fa-paypal',
    'stackoverflow.com': 'fab fa-stack-overflow',
    'quora.com': 'fab fa-quora'
  };

  try {
    // Ensure protocol for URL parsing
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');

    // Find the best matching icon for the domain
    for (const key in platformIcons) {
      if (domain.endsWith(key)) {
        return platformIcons[key];
      }
    }
    return 'fas fa-external-link-alt';
  } catch (e) {
    return 'fas fa-link';
  }
}