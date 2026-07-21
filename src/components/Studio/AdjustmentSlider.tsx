"use client";

import styles from "./style.module.scss";

interface AdjustmentSliderProps {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    onChange: (value: number) => void;
}

export default function AdjustmentSlider({
    id,
    label,
    value,
    min,
    max,
    step = 1,
    suffix,
    onChange,
}: AdjustmentSliderProps) {
    return (
        <div className={styles.controlGroup}>
            <div className={styles.controlLabelRow}>
                <label htmlFor={id}>{label}</label>
                <div className={styles.inputGroup}>
                    <input
                        type="number"
                        value={value}
                        step={step}
                        min={min}
                        max={max}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className={styles.numberInput}
                    />
                    {suffix ? <span>{suffix}</span> : null}
                </div>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={styles.slider}
            />
        </div>
    );
}
