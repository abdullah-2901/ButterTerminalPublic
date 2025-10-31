let telegramScriptPromise = null;

function loadTelegramWidgetScript() {
  if (telegramScriptPromise) return telegramScriptPromise;
  telegramScriptPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.Login) return resolve();
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Telegram widget'));
    document.head.appendChild(s);
  });
  return telegramScriptPromise;
}

export function getSavedTelegramUser() { return null; }

export function clearSavedTelegramUser() {
  // no-op: we no longer persist telegram user locally
}

export async function connectTelegram({ botId, botUsername, requestAccess = 'write' } = {}) {
  if (!botId && !botUsername) throw new Error('Telegram bot id or username is required');
  await loadTelegramWidgetScript();

  // Normalize botId: allow passing full bot token like "123456:ABCDEF..."
  let normalizedBotId = botId;
  if (typeof normalizedBotId === 'string' && normalizedBotId.includes(':')) {
    const left = normalizedBotId.split(':')[0];
    if (/^\d+$/.test(left)) normalizedBotId = left;
  }

  const tryDirectAuth = () => new Promise((resolve, reject) => {
    if (!window.Telegram || !window.Telegram.Login) {
      return reject(new Error('Telegram Login unavailable'));
    }
    if (!normalizedBotId || isNaN(Number(normalizedBotId))) {
      return reject(new Error('Direct auth requires numeric bot id'));
    }
    window.Telegram.Login.auth(
      { bot_id: Number(normalizedBotId), request_access: requestAccess },
      (response) => {
        if (!response || response.error) {
          return reject(new Error(response?.error || 'Telegram auth failed'));
        }
        const user = {
          id: response.id,
          username: response.username || '',
          first_name: response.first_name || '',
          last_name: response.last_name || '',
          auth_date: response.auth_date,
          hash: response.hash
        };
        resolve(user);
      }
    );
  });

  const tryWidgetInjection = () => new Promise((resolve, reject) => {
    const username = (botUsername || '').replace(/^@/, '');
    if (!username) return reject(new Error('Bot username required for widget'));

    // Create a temporary container and inject the widget script with attributes
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-10000px';
    container.style.left = '-10000px';
    container.id = 'tg-login-container-temp';
    document.body.appendChild(container);

    const cleanup = () => {
      try {
        if (container && container.parentNode) container.parentNode.removeChild(container);
        // eslint-disable-next-line no-underscore-dangle
        delete window.__onTelegramAuth;
      } catch {}
    };

    // eslint-disable-next-line no-underscore-dangle
    window.__onTelegramAuth = (response) => {
      try {
        if (!response || response.error) {
          cleanup();
          return reject(new Error(response?.error || 'Telegram auth failed'));
        }
        const user = {
          id: response.id,
          username: response.username || '',
          first_name: response.first_name || '',
          last_name: response.last_name || '',
          auth_date: response.auth_date,
          hash: response.hash
        };
        cleanup();
        resolve(user);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', username);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-request-access', requestAccess);
    s.setAttribute('data-userpic', 'false');
    s.setAttribute('data-onauth', '__onTelegramAuth(user)');
    s.onerror = () => {
      cleanup();
      reject(new Error('Failed to initialize Telegram widget'));
    };
    container.appendChild(s);
  });

  // Prefer direct auth when numeric bot id present; otherwise fallback to widget via username
  if (normalizedBotId && !isNaN(Number(normalizedBotId))) {
    try {
      return await tryDirectAuth();
    } catch (e) {
      // Fallback to widget if username provided
      if (botUsername) {
        return await tryWidgetInjection();
      }
      throw e;
    }
  }
  // No numeric id, try widget path
  return await tryWidgetInjection();
}


