"use client";

import { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { shaderMaterial, useTexture } from "@react-three/drei";
import * as THREE from "three";
import vertexShader from "@/lib/Shaders/geo.vert";
import fragmentShader from "@/lib/Shaders/grade.frag";
import {
    buildGradeUniforms,
    enableGradeMipmaps,
    type GradeUniformValues
} from "@/lib/Shaders/gradeUniforms";

interface SceneProps {
    imageSrc: string;
    settings: GradeUniformValues;
}

const PhotoGradingMaterial = shaderMaterial(
    {
        u_texture: null,
        u_resolution: new THREE.Vector2(1, 1),
        u_time: 0,
        u_temperature: 0,
        u_tint: 0,
        u_exposure: 0,
        u_brightness: 0,
        u_contrast: 1,
        u_highlights: 0,
        u_shadows: 0,
        u_whites: 0,
        u_blacks: 0,
        u_useCurves: false,
        u_curveMaster: null,
        u_curveR: null,
        u_curveG: null,
        u_curveB: null,
        u_vibrance: 0,
        u_saturation: 0,
        u_clarity: 0,
        u_textureAmt: 0,
        u_dehaze: 0,
        u_hueMix: new Array(8).fill(0),
        u_satMix: new Array(8).fill(0),
        u_lumMix: new Array(8).fill(0),
        u_gradeShadows: new THREE.Vector3(0, 0, 0),
        u_gradeMidtones: new THREE.Vector3(0, 0, 0),
        u_gradeHighlights: new THREE.Vector3(0, 0, 0),
        u_gradeBlending: 0.5,
        u_gradeBalance: 0,
        u_vignetteAmount: 0,
        u_vignetteMidpoint: 0.6,
        u_vignetteFeather: 0.4,
        u_vignetteRoundness: 0.6,
        u_grainAmount: 0,
        u_grainSize: 2,
        u_grainRoughness: 0.5,
        u_sharpenAmount: 0,
        u_sharpenRadius: 1,
        u_outputMode: 0,
        u_dotSize: 6,
        u_dotGap: 6,
        u_matrixSize: 8,
    },
    vertexShader,
    fragmentShader
);

function PostProcessingQuad({ imageSrc, settings }: SceneProps) {
    const materialRef = useRef<InstanceType<typeof PhotoGradingMaterial>>(null);
    const { size } = useThree();
    const texture = useTexture(imageSrc);

    useEffect(() => {
        if (texture) {
            enableGradeMipmaps(texture);
        }
    }, [texture]);

    const resolution = useMemo(() => new THREE.Vector2(size.width, size.height), [size]);
    const gradingUniforms = useMemo(() => {
        return buildGradeUniforms(texture, resolution, settings);
    }, [texture, resolution, settings]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.u_time = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh scale={[size.width, size.height, 1]}>
            <planeGeometry args={[1, 1]} />
            <primitive
                object={new PhotoGradingMaterial()}
                ref={materialRef}
                attach="material"
                {...gradingUniforms}
            />
        </mesh>
    );
}

export default function Scene({ imageSrc, settings }: SceneProps) {
    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                gl={{
                    preserveDrawingBuffer: true,
                    antialias: false,
                    powerPreference: "high-performance"
                }}
                orthographic
                camera={{ left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 1000 }}
            >
                <PostProcessingQuad imageSrc={imageSrc} settings={settings} />
            </Canvas>
        </div>
    );
}