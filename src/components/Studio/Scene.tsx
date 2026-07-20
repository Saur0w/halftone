"use client";

import { Suspense, useMemo, useRef, useEffect, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { DitherFragment } from "@/lib/Shaders/ditherShader";
import { VertexFragment } from "@/lib/Shaders/geoShader";

interface SceneProps {
    imageSrc: string;
    exportRef?: RefObject<(() => void) | null>;
}

function PostProcessing({ imageSrc, exportRef }: SceneProps) {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const { size, gl, scene, camera } = useThree();

    const texture = useTexture(imageSrc);

    useEffect(() => {
        if (!texture) return;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;
    }, [texture]);

    const uniforms = useMemo(() => ({
        u_texture: { value: texture },
        u_resolution: { value: new THREE.Vector2(size.width, size.height) },
        u_time: { value: 0 }
    }), [texture, size.width, size.height]);

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
                ref={materialRef}
                vertexShader={VertexFragment}
                fragmentShader={DitherFragment}
                uniforms={uniforms}
                glslVersion={THREE.GLSL3}
            />
        </mesh>
    );
}

export default function Scene({ imageSrc, exportRef }: SceneProps) {
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
                <Suspense fallback={null}>
                    <PostProcessing imageSrc={imageSrc} exportRef={exportRef} />
                </Suspense>
            </Canvas>
        </div>
    );
}