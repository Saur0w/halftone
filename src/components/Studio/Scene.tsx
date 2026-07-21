"use client";

import { Suspense, useMemo, useRef, useEffect, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { DitherFragment } from "@/lib/Shaders/ditherShader";
import { AsciiFragment } from "@/lib/Shaders/asciiShader";
import { OriginalFragment } from "@/lib/Shaders/originalShader";
import { HalftoneFragment } from "@/lib/Shaders/halftoneShader";
import { PencilFragment } from "@/lib/Shaders/pencilShader";
import { VertexFragment } from "@/lib/Shaders/geoShader";
import { MonochromeFragment } from "@/lib/Shaders/monochromeShader";
import { ThermalFragment } from "@/lib/Shaders/thermalShader";
import { RadiationFragment } from "@/lib/Shaders/radiationShader";
import { NightvisionFragment } from "@/lib/Shaders/nightvisionShader";
import { TopographicFragment } from "@/lib/Shaders/topographicShader";
import {
    DEFAULT_TONE_CURVE,
    GRADE_COLOR_RGB,
    type GradeColorId,
} from "@/lib/Shaders/lightroomHelper";

interface SceneProps {
    imageSrc: string;
    exportRef?: RefObject<(() => void) | null>;
    brightness?: number;
    contrast?: number;
    dotScale?: number;
    matrixSize?: number;
    activeFilter?: string;
    angle?: number;
    shape?: string;
    jitter?: number;
    inkColor?: string;
    canvasColor?: string;
    invertPalette?: boolean;
    temperature?: number;
    tint?: number;
    saturation?: number;
    vibrance?: number;
    highlights?: number;
    shadows?: number;
    gradeShadows?: GradeColorId;
    gradeMidtones?: GradeColorId;
    gradeHighlights?: GradeColorId;
    gradeIntensity?: number;
    grainAmount?: number;
    grainSize?: number;
    grainSpeed?: number;
    toneCurve?: number[];
}

function vec3FromGrade(colorId: GradeColorId): THREE.Vector3 {
    const [r, g, b] = GRADE_COLOR_RGB[colorId];
    return new THREE.Vector3(r, g, b);
}

function PostProcessing({
    imageSrc,
    exportRef,
    brightness = 8,
    contrast = 1.24,
    dotScale = 6,
    matrixSize = 8,
    angle = 0,
    shape = "dot",
    jitter = 0,
    inkColor = "#000000",
    canvasColor = "#ffffff",
    invertPalette = false,
    activeFilter = "dither",
    temperature = 0,
    tint = 0,
    saturation = 0,
    vibrance = 0,
    highlights = 0,
    shadows = 0,
    gradeShadows = "neutral",
    gradeMidtones = "neutral",
    gradeHighlights = "neutral",
    gradeIntensity = 0.5,
    grainAmount = 0,
    grainSize = 2,
    grainSpeed = 0,
    toneCurve = DEFAULT_TONE_CURVE,
}: SceneProps) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const { size, gl, scene, camera } = useThree();

    const texture = useTexture(imageSrc);

    useEffect(() => {
        if (!texture) return;
        // eslint-disable-next-line
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;
    }, [texture]);

    const toneCurveArray = useMemo(
        () => new Float32Array(toneCurve.length >= 32 ? toneCurve.slice(0, 32) : DEFAULT_TONE_CURVE),
        [toneCurve]
    );

    const uniforms = useMemo(
        () => ({
            u_texture: { value: texture },
            u_resolution: { value: new THREE.Vector2(size.width, size.height) },
            u_time: { value: 0 },
            u_brightness: { value: brightness },
            u_contrast: { value: contrast },
            u_dotScale: { value: dotScale },
            u_matrixSize: { value: matrixSize },
            u_angle: { value: angle },
            u_shape: { value: shape === "dot" ? 0 : shape === "line" ? 1 : 2 },
            u_jitter: { value: jitter },
            u_inkColor: { value: new THREE.Color(inkColor) },
            u_canvasColor: { value: new THREE.Color(canvasColor) },
            u_invertPalette: { value: invertPalette ? 1.0 : 0.0 },
            u_temperature: { value: temperature },
            u_tint: { value: tint },
            u_saturation: { value: saturation },
            u_vibrance: { value: vibrance },
            u_highlights: { value: highlights },
            u_shadows: { value: shadows },
            u_gradeShadows: { value: vec3FromGrade(gradeShadows) },
            u_gradeMidtones: { value: vec3FromGrade(gradeMidtones) },
            u_gradeHighlights: { value: vec3FromGrade(gradeHighlights) },
            u_gradeIntensity: { value: gradeIntensity },
            u_grainAmount: { value: grainAmount },
            u_grainSize: { value: grainSize },
            u_grainSpeed: { value: grainSpeed },
            u_toneCurve: { value: toneCurveArray },
        }),
        [
            texture,
            size.width,
            size.height,
            brightness,
            contrast,
            dotScale,
            matrixSize,
            angle,
            shape,
            jitter,
            inkColor,
            canvasColor,
            invertPalette,
            temperature,
            tint,
            saturation,
            vibrance,
            highlights,
            shadows,
            gradeShadows,
            gradeMidtones,
            gradeHighlights,
            gradeIntensity,
            grainAmount,
            grainSize,
            grainSpeed,
            toneCurveArray,
        ]
    );

    useEffect(() => {
        if (!materialRef.current) return;
        materialRef.current.uniforms.u_toneCurve.value = toneCurveArray;
    }, [toneCurveArray]);

    useFrame((state) => {
        if (materialRef.current?.uniforms.u_time) {
            materialRef.current.uniforms.u_time.value = state.clock.getElapsedTime();
        }
    });

    const image = texture.image as HTMLImageElement | undefined;
    const imageAspect = image ? image.width / image.height : 1;
    const canvasAspect = size.width / size.height;

    let scaleX = 1;
    let scaleY = 1;

    if (imageAspect > canvasAspect) {
        scaleY = canvasAspect / imageAspect;
    } else {
        scaleX = imageAspect / canvasAspect;
    }

    useEffect(() => {
        if (!exportRef) return;

        exportRef.current = () => {
            if (!texture.image || !meshRef.current) return;

            const image = texture.image as HTMLImageElement;
            const naturalWidth = image.naturalWidth || image.width;
            const naturalHeight = image.naturalHeight || image.height;

            const originalPixelRatio = gl.getPixelRatio();
            gl.setPixelRatio(1);
            gl.setSize(naturalWidth, naturalHeight, false);

            if (materialRef.current?.uniforms.u_resolution) {
                materialRef.current.uniforms.u_resolution.value.set(naturalWidth, naturalHeight);
            }
            meshRef.current.scale.set(1, 1, 1);
            meshRef.current.updateMatrixWorld(true);

            gl.render(scene, camera);
            const dataUrl = gl.domElement.toDataURL("image/png", 1.0);

            gl.setPixelRatio(originalPixelRatio);
            gl.setSize(size.width, size.height, false);

            if (materialRef.current?.uniforms.u_resolution) {
                materialRef.current.uniforms.u_resolution.value.set(size.width, size.height);
            }
            meshRef.current.scale.set(scaleX, scaleY, 1);
            meshRef.current.updateMatrixWorld(true);
            gl.render(scene, camera);

            const downloadAnchor = document.createElement("a");
            downloadAnchor.download = `halftone_export_${Date.now()}.png`;
            downloadAnchor.href = dataUrl;
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        return () => {
            exportRef.current = null;
        };
    }, [gl, scene, camera, texture, size, exportRef, scaleX, scaleY]);

    return (
        <mesh ref={meshRef} scale={[scaleX, scaleY, 1]}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                key={activeFilter}
                ref={materialRef}
                vertexShader={VertexFragment}
                fragmentShader={
                    activeFilter === "pencil"
                        ? PencilFragment
                        : activeFilter === "halftone"
                          ? HalftoneFragment
                          : activeFilter === "ascii"
                            ? AsciiFragment
                            : activeFilter === "original"
                              ? OriginalFragment
                              : activeFilter === "monochrome"
                                ? MonochromeFragment
                                : activeFilter === "thermal"
                                  ? ThermalFragment
                                  : activeFilter === "radiation"
                                    ? RadiationFragment
                                    : activeFilter === "nightvision"
                                      ? NightvisionFragment
                                      : activeFilter === "topographic"
                                        ? TopographicFragment
                                        : DitherFragment
                }
                uniforms={uniforms}
                glslVersion={THREE.GLSL3}
            />
        </mesh>
    );
}

export default function Scene({
    imageSrc,
    exportRef,
    brightness,
    contrast,
    dotScale,
    matrixSize,
    angle,
    shape,
    jitter,
    inkColor,
    canvasColor,
    invertPalette,
    activeFilter,
    temperature,
    tint,
    saturation,
    vibrance,
    highlights,
    shadows,
    gradeShadows,
    gradeMidtones,
    gradeHighlights,
    gradeIntensity,
    grainAmount,
    grainSize,
    grainSpeed,
    toneCurve,
}: SceneProps) {
    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                gl={{
                    preserveDrawingBuffer: true,
                    antialias: false,
                    powerPreference: "high-performance",
                }}
                orthographic
                camera={{ left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 1000 }}
            >
                <Suspense fallback={null}>
                    <PostProcessing
                        imageSrc={imageSrc}
                        exportRef={exportRef}
                        brightness={brightness}
                        contrast={contrast}
                        dotScale={dotScale}
                        matrixSize={matrixSize}
                        angle={angle}
                        shape={shape}
                        jitter={jitter}
                        inkColor={inkColor}
                        canvasColor={canvasColor}
                        invertPalette={invertPalette}
                        activeFilter={activeFilter}
                        temperature={temperature}
                        tint={tint}
                        saturation={saturation}
                        vibrance={vibrance}
                        highlights={highlights}
                        shadows={shadows}
                        gradeShadows={gradeShadows}
                        gradeMidtones={gradeMidtones}
                        gradeHighlights={gradeHighlights}
                        gradeIntensity={gradeIntensity}
                        grainAmount={grainAmount}
                        grainSize={grainSize}
                        grainSpeed={grainSpeed}
                        toneCurve={toneCurve}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
