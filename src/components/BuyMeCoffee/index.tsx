"use client";

import { useState, useCallback } from "react";
import styles from "./style.module.scss";

interface BuyMeCoffeeProps {
    isOpen: boolean;
    onClose: () => void;
    // Replace these defaults with your actual handles / UPI ID
    bmcUsername?: string; 
    upiId?: string;
}

const PRESETS = [
    { cups: 1, amount: "$3", label: "1 COFFEE", note: "FUEL SINGLE PASS" },
    { cups: 3, amount: "$9", label: "3 COFFEES", note: "GPU OVERCLOCK" },
    { cups: 5, amount: "$15", label: "5 COFFEES", note: "ALL-NIGHTER SHADER" },
] as const;

export default function BuyMeCoffee({
    isOpen,
    onClose,
    bmcUsername = "yourname", // Replace with your BuyMeACoffee username
    upiId = "yourname@upi",   // Replace with your UPI ID if needed
}: BuyMeCoffeeProps) {
    const [selectedCups, setSelectedCups] = useState<number>(3);
    const [copiedUpi, setCopiedUpi] = useState(false);

    const activePreset = PRESETS.find((p) => p.cups === selectedCups) || PRESETS[1];

    const handleCopyUpi = useCallback(() => {
        if (!upiId) return;
        navigator.clipboard.writeText(upiId);
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2000);
    }, [upiId]);

    const handleRedirect = useCallback(() => {
        const url = `https://www.buymeacoffee.com/${bmcUsername}?amount=${activePreset.cups * 3}`;
        window.open(url, "_blank", "noopener,noreferrer");
    }, [bmcUsername, activePreset.cups]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <header className={styles.cardHeader}>
                    <div className={styles.titleGroup}>
                        <span className={styles.badge}>PAYLOAD // SUPPORT</span>
                        <h3 className={styles.mainTitle}>Fuel the GPU.</h3>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                        ✕
                    </button>
                </header>

                <p className={styles.description}>
                    If this shader engine helped your workflow, drop a coffee to keep the render pipeline running and code open-source.
                </p>

                <div className={styles.presetGrid}>
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.cups}
                            onClick={() => setSelectedCups(preset.cups)}
                            className={`${styles.presetCard} ${
                                selectedCups === preset.cups ? styles.activePreset : ""
                            }`}
                        >
                            <span className={styles.cupCount}>☕ × {preset.cups}</span>
                            <strong className={styles.amount}>{preset.amount}</strong>
                            <span className={styles.presetNote}>{preset.note}</span>
                        </button>
                    ))}
                </div>

                <div className={styles.actionContainer}>
                    <button className={styles.primaryBtn} onClick={handleRedirect}>
                        <span>SUPPORT {activePreset.amount} VIA COFFEE</span>
                        <span className={styles.arrowIcon}>→</span>
                    </button>

                    {upiId && (
                        <button
                            className={`${styles.secondaryBtn} ${copiedUpi ? styles.copied : ""}`}
                            onClick={handleCopyUpi}
                        >
                            <span>{copiedUpi ? "✓ UPI ID COPIED" : `COPY UPI: ${upiId}`}</span>
                        </button>
                    )}
                </div>

                <footer className={styles.cardFooter}>
                    <span>STATUS: 100% DIRECT SUPPORT</span>
                    <span className={styles.accentText}>ZERO MIDDLEMAN</span>
                </footer>
            </div>
        </div>
    );
}