// Reusable Framer Motion animation variants for the "Luxury Dark Atelier" theme

export const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' }
    })
};

export const fadeIn = {
    hidden: { opacity: 0 },
    visible: (i = 0) => ({
        opacity: 1,
        transition: { delay: i * 0.05, duration: 0.35 }
    })
};

export const scaleIn = {
    hidden: { opacity: 0, scale: 0.93 },
    visible: {
        opacity: 1, scale: 1,
        transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
    }
};

export const slideInLeft = {
    hidden: { opacity: 0, x: -24 },
    visible: (i = 0) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' }
    })
};

export const slideInRight = {
    hidden: { opacity: 0, x: 24 },
    visible: (i = 0) => ({
        opacity: 1, x: 0,
        transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' }
    })
};

export const staggerContainer = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.07 }
    }
};

export const pageTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: 'easeOut' }
};

export const modalOverlay = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
};

export const modalContent = {
    hidden: { opacity: 0, scale: 0.92, y: 20 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
    },
    exit: {
        opacity: 0, scale: 0.92, y: 20,
        transition: { duration: 0.15, ease: 'easeIn' }
    }
};

// Numeric count-up hook
import { useState, useEffect, useRef } from 'react';

export function useCountUp(end, duration = 1000) {
    const [count, setCount] = useState(0);
    const startRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        if (end === 0 || end === undefined || end === null) {
            setCount(0);
            return;
        }

        startRef.current = performance.now();
        const animate = (now) => {
            const elapsed = now - startRef.current;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCount(Math.round(eased * end));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [end, duration]);

    return count;
}

// Avatar color generator based on name
export function getAvatarColor(name) {
    const colors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#14b8a6'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name) {
    return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
