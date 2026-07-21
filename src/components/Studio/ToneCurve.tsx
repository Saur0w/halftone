"use client";

import { useCallback, useMemo, useRef, type PointerEvent } from "react";
import { DEFAULT_TONE_CURVE } from "@/lib/Shaders/lightroomHelper";
import styles from "./style.module.scss";

interface ToneCurveProps {
    curve: number[];
    onChange: (curve: number[]) => void;
}

const CONTROL_X = [0, 0.25, 0.5, 0.75, 1];

function buildCurveFromPoints(yPoints: number[]): number[] {
    const lut = new Array<number>(32);
    for (let i = 0; i < 32; i++) {
        const x = i / 31;
        let segment = 0;
        for (let s = 0; s < CONTROL_X.length - 1; s++) {
            if (x >= CONTROL_X[s] && x <= CONTROL_X[s + 1]) {
                segment = s;
                break;
            }
        }
        const x0 = CONTROL_X[segment];
        const x1 = CONTROL_X[segment + 1];
        const y0 = yPoints[segment];
        const y1 = yPoints[segment + 1];
        const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
        lut[i] = Math.max(0, Math.min(1, y0 + (y1 - y0) * t));
    }
    return lut;
}

function curveToControlPoints(curve: number[]): number[] {
    return CONTROL_X.map((x) => {
        const idx = Math.round(x * 31);
        return curve[idx] ?? x;
    });
}

export default function ToneCurve({ curve, onChange }: ToneCurveProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const controlPoints = useMemo(() => curveToControlPoints(curve), [curve]);

    const pathD = useMemo(() => {
        const samples = buildCurveFromPoints(controlPoints);
        return samples
            .map((y, i) => {
                const x = (i / 31) * 100;
                const sy = (1 - y) * 100;
                return `${i === 0 ? "M" : "L"} ${x} ${sy}`;
            })
            .join(" ");
    }, [controlPoints]);

    const updatePoint = useCallback(
        (index: number, clientX: number, clientY: number) => {
            if (!svgRef.current || index === 0 || index === CONTROL_X.length - 1) return;
            const rect = svgRef.current.getBoundingClientRect();
            const y = 1 - (clientY - rect.top) / rect.height;
            const clampedY = Math.max(0, Math.min(1, y));
            const next = [...controlPoints];
            next[index] = clampedY;
            onChange(buildCurveFromPoints(next));
        },
        [controlPoints, onChange]
    );

    const handlePointerDown = (index: number) => (e: PointerEvent<SVGCircleElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (index: number) => (e: PointerEvent<SVGCircleElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        updatePoint(index, e.clientX, e.clientY);
    };

    const handleReset = () => onChange([...DEFAULT_TONE_CURVE]);

    return (
        <div className={styles.toneCurveWidget}>
            <div className={styles.toneCurveHeader}>
                <span>RGB CURVE</span>
                <button type="button" className={styles.curveResetBtn} onClick={handleReset}>
                    LINEAR
                </button>
            </div>
            <svg
                ref={svgRef}
                viewBox="0 0 100 100"
                className={styles.toneCurveSvg}
                aria-label="Tone curve editor"
            >
                {[0, 25, 50, 75, 100].map((g) => (
                    <line key={`h-${g}`} x1="0" y1={g} x2="100" y2={g} className={styles.curveGridLine} />
                ))}
                {[0, 25, 50, 75, 100].map((g) => (
                    <line key={`v-${g}`} x1={g} y1="0" x2={g} y2="100" className={styles.curveGridLine} />
                ))}
                <line x1="0" y1="100" x2="100" y2="0" className={styles.curveDiagonal} />
                <path d={pathD} className={styles.curvePath} fill="none" />
                {CONTROL_X.map((x, i) => {
                    const cx = x * 100;
                    const cy = (1 - controlPoints[i]) * 100;
                    const draggable = i !== 0 && i !== CONTROL_X.length - 1;
                    return (
                        <circle
                            key={x}
                            cx={cx}
                            cy={cy}
                            r={draggable ? 3.5 : 2.5}
                            className={draggable ? styles.curveHandle : styles.curveAnchor}
                            onPointerDown={draggable ? handlePointerDown(i) : undefined}
                            onPointerMove={draggable ? handlePointerMove(i) : undefined}
                        />
                    );
                })}
            </svg>
        </div>
    );
}
