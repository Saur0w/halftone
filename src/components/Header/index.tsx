"use client";

import styles from "./style.module.scss";

interface HeaderProps {
    activeState?: "01" | "02";
    onExport?: () => void;
}

export default function Header({ activeState = "01", onExport }: HeaderProps) {
    return (
        <header className={styles.header}>
            <div className={styles.body}>
                <div className={styles.leftSection}>
                    <div className={styles.branding}>
                        <h1 className={styles.title}>halftone</h1>
                        <svg
                            className={styles.engineIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                    </div>
                </div>

                <div className={styles.rightSection}>

                    <button
                        className={styles.exportBtn}
                        onClick={onExport}
                        disabled={activeState === "01"}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <path d="M12 15V3" />
                        </svg>
                        EXPORT HIGH-RES
                    </button>
                </div>
            </div>
        </header>
    );
}