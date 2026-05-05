let scrollLockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

export const lockPageScroll = () => {
    if (typeof document === 'undefined') {
        return;
    }

    if (scrollLockCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
        previousHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }

    scrollLockCount += 1;
};

export const unlockPageScroll = () => {
    if (typeof document === 'undefined' || scrollLockCount === 0) {
        return;
    }

    scrollLockCount -= 1;

    if (scrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
    }
};