export const copyHandler = (address) => {
    

    return new Promise((resolve) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(address)
                .then(() => resolve(true))
                .catch((err) => {
                    console.error('Clipboard API failed:', err);
                    fallbackCopyTextToClipboard(address, resolve);
                });
        } else {
            fallbackCopyTextToClipboard(address, resolve);
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