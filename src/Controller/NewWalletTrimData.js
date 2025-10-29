export const truncatePublicKey = (publicKey, nmbr) => {
    const key = publicKey?.toString();
    if (!publicKey) {
        return 'Not Connected';
    } else {
        if (nmbr === 4) {
            return `${key.slice(0, nmbr)}...${key.slice(-nmbr)}`;
        } else if (nmbr === 8) {
            return `${key.slice(0, nmbr)}...${key.slice(-(nmbr + 1))}`;
        } else{
            `${key.slice(0, nmbr)}...${key.slice(-nmbr)}`
        }
    }
};

export const copyHandler = (data, key) => {
    const textToCopy = key === 'secret' ? data.secretKey : data.publickey;

    return new Promise((resolve) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => resolve(true))
                .catch((err) => {
                    console.error('Clipboard API failed:', err);
                    fallbackCopyTextToClipboard(textToCopy, resolve);
                });
        } else {
            fallbackCopyTextToClipboard(textToCopy, resolve);
        }
    });
};

function fallbackCopyTextToClipboard(text, resolve) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  // Avoid scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        resolve(successful);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        document.body.removeChild(textArea);
        resolve(false);
    }
}