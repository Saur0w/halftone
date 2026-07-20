"use client";

import {
    useState,
    useRef,
    useCallback,
    useEffect,
    type ChangeEvent,
    type DragEvent,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Header from "../Header";
import Scene from "./Scene";
import styles from "./style.module.scss";

gsap.registerPlugin(useGSAP);

const FILTERS = [
    { id: "halftone", label: "HALFTONE PRINT", num: "01" },
    { id: "dither", label: "DITHER MODE", num: "02" },
    { id: "ascii", label: "ASCII VECTOR", num: "03" },
    { id: "pixelate", label: "PIXELATE RETRO", num: "04" },
    { id: "pencil", label: "PENCIL SKETCH", num: "05" },
    { id: "original", label: "ORIGINAL", num: "00" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
type MatrixSize = "2" | "4" | "8" | "16";
type ShapeType = "dot" | "line" | "cross";

const MATRIX_SIZES: MatrixSize[] = ["2", "4", "8", "16"];
const SHAPES: ShapeType[] = ["dot", "line", "cross"];

const formatSigned = (value: number) =>
    `${value >= 0 ? "+" : "-"}${String(Math.abs(value)).padStart(2, "0")}`;

interface FilterSettings {
    brightness: number;
    contrast: number;
    dotScale: number;
    matrixSize: MatrixSize;
    angle: number;
    shape: ShapeType;
    jitter: number;
    dotColor: string;
    bgColor: string;
}

const DEFAULT_SETTINGS: Record<FilterId, FilterSettings> = {
    halftone: { brightness: 10, contrast: 1.1, dotScale: 8, matrixSize: "8", angle: 45, shape: "dot", jitter: 0, dotColor: "#000000", bgColor: "#ffffff" },
    dither: { brightness: 8, contrast: 1.24, dotScale: 6, matrixSize: "8", angle: 0, shape: "dot", jitter: 0, dotColor: "#000000", bgColor: "#ffffff" },
    ascii: { brightness: 5, contrast: 1.5, dotScale: 4, matrixSize: "8", angle: 0, shape: "dot", jitter: 0.1, dotColor: "#000000", bgColor: "#ffffff" },
    pixelate: { brightness: 0, contrast: 1.0, dotScale: 10, matrixSize: "4", angle: 0, shape: "dot", jitter: 0, dotColor: "#000000", bgColor: "#ffffff" },
    pencil: { brightness: 15, contrast: 1.3, dotScale: 5, matrixSize: "4", angle: -45, shape: "line", jitter: 0.2, dotColor: "#000000", bgColor: "#ffffff" },
    original: { brightness: 0, contrast: 1.0, dotScale: 1, matrixSize: "2", angle: 0, shape: "dot", jitter: 0, dotColor: "#000000", bgColor: "#ffffff" },
};

export default function StudioManager() {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterId>("halftone");
    const [isDragging, setIsDragging] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);

    const [settings, setSettings] = useState<Record<FilterId, FilterSettings>>(DEFAULT_SETTINGS);

    const currentSettings = settings[activeFilter];

    const updateSetting = useCallback(<K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) => {
        setSettings(prev => ({
            ...prev,
            [activeFilter]: {
                ...prev[activeFilter],
                [key]: value
            }
        }));
    }, [activeFilter]);

    const handleReset = useCallback(() => {
        setSettings(prev => ({
            ...prev,
            [activeFilter]: { ...DEFAULT_SETTINGS[activeFilter] }
        }));
    }, [activeFilter]);

    const containerRef = useRef<HTMLDivElement>(null);
    const dropZoneRef = useRef<HTMLLabelElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const canvasExportRef = useRef<(() => void) | null>(null);

    const processFile = useCallback((file: File | undefined) => {
        if (!file || !file.type.startsWith("image/")) return;

        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setImageSrc(url);
    }, []);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        };
    }, []);

    const handleFileChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            processFile(e.target.files?.[0]);
            e.target.value = "";
        },
        [processFile]
    );

    const handleDragOver = useCallback((e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handleDrop = useCallback(
        (e: DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setIsDragging(false);
            processFile(e.dataTransfer.files?.[0]);
        },
        [processFile]
    );

    const handleReturnToIngest = useCallback(() => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
        setImageSrc(null);
    }, []);

    const handleExport = useCallback(() => {
        canvasExportRef.current?.();
    }, []);

    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    useGSAP(
        () => {
            if (imageSrc || prefersReducedMotion) return;
            gsap.fromTo(
                [`.${styles.ingestHeader}`, `.${styles.dropZone}`, `.${styles.telemetryCard}`],
                { opacity: 0, y: 24 },
                { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }
            );
        },
        { scope: containerRef, dependencies: [imageSrc] }
    );

    useGSAP(
        () => {
            if (!imageSrc || prefersReducedMotion) return;
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            tl.fromTo(
                `.${styles.controlSidebar}`,
                { opacity: 0, x: -16 },
                { opacity: 1, x: 0, duration: 0.5 }
            )
                .fromTo(
                    `.${styles.viewportArea}`,
                    { opacity: 0, scale: 0.98 },
                    { opacity: 1, scale: 1, duration: 0.5 },
                    "<0.05"
                )
                .fromTo(
                    `.${styles.dockTab}`,
                    { opacity: 0, y: 12 },
                    { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 },
                    "<0.1"
                );
        },
        { scope: containerRef, dependencies: [imageSrc] }
    );

    useGSAP(
        () => {
            if (!dropZoneRef.current || prefersReducedMotion) return;
            gsap.to(dropZoneRef.current, {
                scale: isDragging ? 1.01 : 1,
                boxShadow: isDragging
                    ? "inset 0 0 32px rgba(201, 255, 51, 0.08)"
                    : "inset 0 0 0px rgba(201, 255, 51, 0)",
                duration: 0.3,
                ease: "power2.out",
            });
        },
        { dependencies: [isDragging], scope: containerRef }
    );

    return (
        <div className={styles.studioView} ref={containerRef}>
            <Header activeState={imageSrc ? "02" : "01"} onExport={handleExport} />

            {!imageSrc ? (
                <main className={styles.ingestContainer}>
                    <div className={styles.ingestHeader}>
                        <h2 className={styles.mainTitle}>Feed the shader.</h2>
                        <p className={styles.subtitle}>
                            Drop a source image to initialize the GPU processing pipeline.
                        </p>
                    </div>

                    <label
                        ref={dropZoneRef}
                        className={`${styles.dropZone} ${isDragging ? styles.dragging : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className={styles.hiddenInput}
                            aria-label="Upload source image"
                        />
                        <div className={styles.dropZoneContent}>
                            <div className={styles.uploadIconBox}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                            </div>
                            <span className={styles.actionText}>DROP IMAGE / CLICK TO BROWSE</span>
                            <span className={styles.metaText}>PNG - JPG - WEBP - TIFF / MAX 128 MP</span>
                        </div>
                    </label>

                    <footer className={styles.telemetryFooter}>
                        <div className={styles.telemetryCard}>
                            <h4>LOCAL PIPELINE</h4>
                            <p>ZERO UPLOADS</p>
                        </div>
                        <div className={styles.telemetryCard}>
                            <h4>RUNTIME</h4>
                            <p>WEBGL 2.0 / WASM</p>
                        </div>
                        <div className={styles.telemetryCard}>
                            <h4>COLOR PIPELINE</h4>
                            <p>16-BIT LINEAR</p>
                        </div>
                    </footer>
                </main>
            ) : (
                <main className={styles.workspaceContainer}>
                    <div className={styles.workspaceHeader}>
                        <div className={styles.headerTitleGroup}>
                            <span className={styles.stageLabel}>ACTIVE FILTERING</span>
                            <h2 className={styles.mainTitle}>Workspace</h2>
                        </div>
                        <div className={styles.headerActions}>
                            <button className={styles.swapBtn} onClick={handleReturnToIngest}>
                                ← NEW SOURCE
                            </button>
                        </div>
                    </div>

                    <div className={styles.workspaceGrid}>
                        <aside className={styles.controlSidebar}>
                            <div className={styles.sidebarHeader}>
                                <h3>ADJUSTMENTS</h3>
                                <button
                                    className={styles.resetBtn}
                                    onClick={handleReset}
                                >
                                    RESET
                                </button>
                            </div>

                            <div className={styles.controlGroup}>
                                <div className={styles.controlLabelRow}>
                                    <label htmlFor="brightness">BRIGHTNESS</label>
                                    <span>{formatSigned(currentSettings.brightness)}</span>
                                </div>
                                <input
                                    id="brightness"
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={currentSettings.brightness}
                                    onChange={(e) => updateSetting("brightness", Number(e.target.value))}
                                    className={styles.slider}
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <div className={styles.controlLabelRow}>
                                    <label htmlFor="contrast">CONTRAST</label>
                                    <span>{currentSettings.contrast.toFixed(2)}</span>
                                </div>
                                <input
                                    id="contrast"
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.01"
                                    value={currentSettings.contrast}
                                    onChange={(e) => updateSetting("contrast", Number(e.target.value))}
                                    className={styles.slider}
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <div className={styles.controlLabelRow}>
                                    <label htmlFor="dotScale">
                                        {activeFilter === "ascii" ? "CHARACTER SIZE" : activeFilter === "pixelate" ? "PIXEL SIZE" : "DOT SCALE"}
                                    </label>
                                    <span>{currentSettings.dotScale.toFixed(1)} PX</span>
                                </div>
                                <input
                                    id="dotScale"
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={currentSettings.dotScale}
                                    onChange={(e) => updateSetting("dotScale", Number(e.target.value))}
                                    className={styles.slider}
                                />
                            </div>

                            {activeFilter === "halftone" || activeFilter === "pencil" ? (
                                <>
                                    <div className={styles.controlGroup}>
                                        <div className={styles.controlLabelRow}>
                                            <label htmlFor="angle">PATTERN ANGLE</label>
                                            <span>{currentSettings.angle.toFixed(0)}°</span>
                                        </div>
                                        <input
                                            id="angle"
                                            type="range"
                                            min="-180"
                                            max="180"
                                            value={currentSettings.angle}
                                            onChange={(e) => updateSetting("angle", Number(e.target.value))}
                                            className={styles.slider}
                                        />
                                    </div>

                                    <div className={styles.controlGroup}>
                                        <div className={styles.controlLabelRow}>
                                            <label>DOT SHAPE</label>
                                            <span className={styles.accentText}>
                                                {currentSettings.shape.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className={styles.matrixSelectorGrid}>
                                            {SHAPES.map((shapeType) => (
                                                <button
                                                    key={shapeType}
                                                    onClick={() => updateSetting("shape", shapeType)}
                                                    aria-pressed={currentSettings.shape === shapeType}
                                                    className={`${styles.matrixBtn} ${
                                                        currentSettings.shape === shapeType ? styles.activeMatrix : ""
                                                    }`}
                                                >
                                                    {shapeType.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            {activeFilter !== "original" && (
                                <>
                                    <div className={styles.controlGroup}>
                                        <div className={styles.controlLabelRow}>
                                            <label htmlFor="dotColor">PIGMENT (DARK AREAS)</label>
                                            <span className={styles.accentText}>{currentSettings.dotColor.toUpperCase()}</span>
                                        </div>
                                        <input
                                            id="dotColor"
                                            type="color"
                                            value={currentSettings.dotColor}
                                            onChange={(e) => updateSetting("dotColor", e.target.value)}
                                            style={{ width: "100%", height: "24px", cursor: "pointer", background: "transparent", border: "none" }}
                                        />
                                    </div>
                                    <div className={styles.controlGroup}>
                                        <div className={styles.controlLabelRow}>
                                            <label htmlFor="bgColor">SURFACE (LIGHT AREAS)</label>
                                            <span className={styles.accentText}>{currentSettings.bgColor.toUpperCase()}</span>
                                        </div>
                                        <input
                                            id="bgColor"
                                            type="color"
                                            value={currentSettings.bgColor}
                                            onChange={(e) => updateSetting("bgColor", e.target.value)}
                                            style={{ width: "100%", height: "24px", cursor: "pointer", background: "transparent", border: "none" }}
                                        />
                                    </div>
                                    <div className={styles.controlGroup}>
                                        <div className={styles.controlLabelRow}>
                                            <label htmlFor="jitter">JITTER</label>
                                            <span>{currentSettings.jitter.toFixed(2)}</span>
                                        </div>
                                        <input
                                            id="jitter"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={currentSettings.jitter}
                                            onChange={(e) => updateSetting("jitter", Number(e.target.value))}
                                            className={styles.slider}
                                        />
                                    </div>
                                </>
                            )}

                            {activeFilter === "dither" && (
                                <div className={styles.controlGroup}>
                                    <div className={styles.controlLabelRow}>
                                        <label>DOT GRID</label>
                                        <span className={styles.accentText}>
                                            {currentSettings.matrixSize} × {currentSettings.matrixSize}
                                        </span>
                                    </div>
                                    <div className={styles.matrixSelectorGrid}>
                                        {MATRIX_SIZES.map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => updateSetting("matrixSize", size)}
                                                aria-pressed={currentSettings.matrixSize === size}
                                                className={`${styles.matrixBtn} ${
                                                    currentSettings.matrixSize === size ? styles.activeMatrix : ""
                                                }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </aside>

                        <section className={styles.viewportArea}>
                            <div className={styles.viewportHeader}>
                                <span>PREVIEW / {activeFilter.toUpperCase()} PRINT</span>
                                <span className={styles.viewportScale}>FIT / 72% / 1:1</span>
                            </div>

                            <div 
                                className={styles.canvasContainer}
                                onPointerDown={() => setShowOriginal(true)}
                                onPointerUp={() => setShowOriginal(false)}
                                onPointerLeave={() => setShowOriginal(false)}
                            >
                                <div className={styles.previewFrame}>
                                    <Scene
                                        imageSrc={imageSrc}
                                        exportRef={canvasExportRef}
                                        brightness={currentSettings.brightness}
                                        contrast={currentSettings.contrast}
                                        dotScale={currentSettings.dotScale}
                                        matrixSize={parseInt(currentSettings.matrixSize, 10)}
                                        angle={currentSettings.angle}
                                        shape={currentSettings.shape}
                                        jitter={currentSettings.jitter}
                                        dotColor={currentSettings.dotColor}
                                        bgColor={currentSettings.bgColor}
                                        activeFilter={showOriginal ? "original" : activeFilter}
                                    />
                                </div>
                            </div>

                            <div className={styles.viewportFooter}>
                                <span>DISPLAY P3 / LINEAR</span>
                            </div>
                        </section>
                    </div>

                    <nav className={styles.filterDock}>
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                aria-pressed={activeFilter === filter.id}
                                className={`${styles.dockTab} ${
                                    activeFilter === filter.id ? styles.activeTab : ""
                                }`}
                            >
                                <span className={styles.tabNum}>
                                    {filter.num} / {activeFilter === filter.id ? "ACTIVE" : "SELECT"}
                                </span>
                                <span className={styles.tabLabel}>{filter.label}</span>
                            </button>
                        ))}
                        <div className={styles.dockExportInfo}>
                            <strong>EXPORTED PAYLOAD</strong>
                        </div>
                    </nav>
                </main>
            )}
        </div>
    );
}