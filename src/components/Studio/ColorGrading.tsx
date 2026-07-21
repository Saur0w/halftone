"use client";

import {
    GRADE_COLOR_RGB,
    type GradeColorId,
} from "@/lib/Shaders/lightroomHelper";
import styles from "./style.module.scss";

const GRADE_PALETTE: { id: GradeColorId; label: string; hex: string }[] = [
    { id: "neutral", label: "N", hex: "#888888" },
    { id: "red", label: "R", hex: "#ff4444" },
    { id: "orange", label: "O", hex: "#ff8844" },
    { id: "yellow", label: "Y", hex: "#ffdd44" },
    { id: "green", label: "G", hex: "#44cc66" },
    { id: "cyan", label: "C", hex: "#44dddd" },
    { id: "blue", label: "B", hex: "#4488ff" },
    { id: "violet", label: "V", hex: "#aa66ff" },
    { id: "magenta", label: "M", hex: "#ff44aa" },
];

interface ColorGradingProps {
    shadows: GradeColorId;
    midtones: GradeColorId;
    highlights: GradeColorId;
    intensity: number;
    onShadowsChange: (color: GradeColorId) => void;
    onMidtonesChange: (color: GradeColorId) => void;
    onHighlightsChange: (color: GradeColorId) => void;
    onIntensityChange: (value: number) => void;
}

interface GradeRowProps {
    label: string;
    value: GradeColorId;
    onChange: (color: GradeColorId) => void;
}

function GradeRow({ label, value, onChange }: GradeRowProps) {
    return (
        <div className={styles.gradeRow}>
            <span className={styles.gradeLabel}>{label}</span>
            <div className={styles.gradePalette}>
                {GRADE_PALETTE.map((color) => (
                    <button
                        key={color.id}
                        type="button"
                        title={color.id}
                        aria-pressed={value === color.id}
                        className={`${styles.gradeSwatch} ${value === color.id ? styles.gradeSwatchActive : ""}`}
                        style={{ "--swatch-color": color.hex } as React.CSSProperties}
                        onClick={() => onChange(color.id)}
                    >
                        {color.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export { GRADE_COLOR_RGB };

export default function ColorGrading({
    shadows,
    midtones,
    highlights,
    intensity,
    onShadowsChange,
    onMidtonesChange,
    onHighlightsChange,
    onIntensityChange,
}: ColorGradingProps) {
    return (
        <div className={styles.colorGrading}>
            <GradeRow label="SHADOWS" value={shadows} onChange={onShadowsChange} />
            <GradeRow label="MIDTONES" value={midtones} onChange={onMidtonesChange} />
            <GradeRow label="HIGHLIGHTS" value={highlights} onChange={onHighlightsChange} />
            <div className={styles.controlGroup}>
                <div className={styles.controlLabelRow}>
                    <label htmlFor="gradeIntensity">INTENSITY</label>
                    <span>{Math.round(intensity * 100)}%</span>
                </div>
                <input
                    id="gradeIntensity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={intensity}
                    onChange={(e) => onIntensityChange(Number(e.target.value))}
                    className={styles.slider}
                />
            </div>
        </div>
    );
}
