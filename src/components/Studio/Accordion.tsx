"use client";

import styles from "./style.module.scss";

interface AccordionProps {
    id: string;
    title: string;
    isOpen: boolean;
    onToggle: (id: string) => void;
    children: React.ReactNode;
}

export default function Accordion({ id, title, isOpen, onToggle, children }: AccordionProps) {
    return (
        <div className={`${styles.accordionPanel} ${isOpen ? styles.accordionOpen : ""}`}>
            <button
                type="button"
                className={styles.accordionTrigger}
                onClick={() => onToggle(id)}
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <span className={styles.accordionChevron}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen ? <div className={styles.accordionBody}>{children}</div> : null}
        </div>
    );
}
