"use client";

import { useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
    type GradeUniformValues,
    DEFAULT_GRADE_VALUES,
    OUTPUT_MODE_TO_INT
} from "./gradeUniforms";

function evaluateCurve(points: [number, number][], x: number): number {
    if (points.length === 0) return x;
    if (x <= points[0][0]) return points[0][1];
    if (x >= points[points.length - 1][0]) return points[points.length - 1][1];

    let i = 0;
    while (i < points.length - 1 && points[i + 1][0] < x) i++;

    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const t = (x - x0) / (x1 - x0 || 1);
    const eased = t * t * (3 - 2 * t);

    return y0 + (y1 - y0) * eased;
}

function useCurveTexture(points: [number, number][]) {
    const texture = useMemo(() => {
        const size = 256;
        const data = new Uint8Array(size * 4);
        const sorted = [...points].sort((a, b) => a[0] - b[0]);

        for (let i = 0; i < size; i++) {
            const x = i / (size - 1);
            const y = evaluateCurve(sorted, x);
            const v = Math.round(THREE.MathUtils.clamp(y, 0, 1) * 255);
            data[i * 4]     = v;
            data[i * 4 + 1] = v;
            data[i * 4 + 2] = v;
            data[i * 4 + 3] = 255;
        }

        const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
        tex.needsUpdate = true;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.generateMipmaps = false;
        return tex;
    }, [points]);

    useEffect(() => {
        return () => {
            texture.dispose();
        };
    }, [texture]);

    return texture;
}

interface UseGradeUniformsProps {
    sourceTexture: THREE.Texture;
    values?: GradeUniformValues;
    masterCurvePoints?: [number, number][];
    rCurvePoints?: [number, number][];
    gCurvePoints?: [number, number][];
    bCurvePoints?: [number, number][];
}

export function useGradeUniforms({
                                     sourceTexture,
                                     values = DEFAULT_GRADE_VALUES,
                                     masterCurvePoints = [[0, 0], [1, 1]],
                                     rCurvePoints = [[0, 0], [1, 1]],
                                     gCurvePoints = [[0, 0], [1, 1]],
                                     bCurvePoints = [[0, 0], [1, 1]],
                                 }: UseGradeUniformsProps) {
    const { size } = useThree();

    const uCurveMaster = useCurveTexture(masterCurvePoints);
    const uCurveR = useCurveTexture(rCurvePoints);
    const uCurveG = useCurveTexture(gCurvePoints);
    const uCurveB = useCurveTexture(bCurvePoints);

    const resolutionVector = useMemo(() => {
        return new THREE.Vector2(size.width, size.height);
    }, [size.width, size.height]);

    const uniforms = useMemo(() => {
        return {
            u_texture: sourceTexture,
            u_resolution: resolutionVector,
            u_time: 0,

            u_temperature: values.temperature,
            u_tint: values.tint,
            u_exposure: values.exposure,
            u_brightness: values.brightness,
            u_contrast: values.contrast,
            u_highlights: values.highlights,
            u_shadows: values.shadows,
            u_whites: values.whites,
            u_blacks: values.blacks,

            u_useCurves: true,
            u_curveMaster: uCurveMaster,
            u_curveR: uCurveR,
            u_curveG: uCurveG,
            u_curveB: uCurveB,

            u_vibrance: values.vibrance,
            u_saturation: values.saturation,
            u_clarity: values.clarity,
            u_textureAmt: values.textureAmt,
            u_dehaze: values.dehaze,

            u_hueMix: values.hueMix,
            u_satMix: values.satMix,
            u_lumMix: values.lumMix,

            u_gradeShadows: new THREE.Vector3(...values.gradeShadows),
            u_gradeMidtones: new THREE.Vector3(...values.gradeMidtones),
            u_gradeHighlights: new THREE.Vector3(...values.gradeHighlights),
            u_gradeBlending: values.gradeBlending,
            u_gradeBalance: values.gradeBalance,

            u_vignetteAmount: values.vignetteAmount,
            u_vignetteMidpoint: values.vignetteMidpoint,
            u_vignetteFeather: values.vignetteFeather,
            u_vignetteRoundness: values.vignetteRoundness,

            u_grainAmount: values.grainAmount,
            u_grainSize: values.grainSize,
            u_grainRoughness: values.grainRoughness,

            u_sharpenAmount: values.sharpenAmount,
            u_sharpenRadius: values.sharpenRadius,

            u_outputMode: OUTPUT_MODE_TO_INT[values.outputMode],
            u_dotSize: values.dotSize,
            u_dotGap: values.dotGap,
            u_matrixSize: values.matrixSize,
        };
    }, [
        sourceTexture,
        resolutionVector,
        values,
        uCurveMaster,
        uCurveR,
        uCurveG,
        uCurveB
    ]);

    return uniforms;
}