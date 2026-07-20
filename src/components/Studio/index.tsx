"use client";

import {
    useState,
    useRef,
    useCallback,
    useEffect,
    type ChangeEvent,
    type DragEvent,
} from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Header from "../Header";
import styles from "./style.module.scss";

gsap.registerPlugin(useGSAP);

// Static data lives outside the component so it isn't re-created on every render.
const FILTERS = [
    { id: "halftone", label: "HALFTONE PRINT", num: "01" },
    { id: "dither", label: "DITHER MODE", num: "02" },
    { id: "ascii", label: "ASCII VECTOR", num: "03" },
    { id: "pixelate", label: "PIXELATE RETRO", num: "04" },
    { id: "pencil", label: "PENCIL SKETCH", num: "05" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
type MatrixSize = "2" | "4" | "8" | "16";

const MATRIX_SIZES: MatrixSize[] = ["2", "4", "8", "16"];

const formatSigned = (value: number) =>
    `${value >= 0 ? "+" : "-"}${String(Math.abs(value)).padStart(2, "0")}`;

export default function StudioManager() {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterId>("halftone");
    const [isDragging, setIsDragging] = useState(false);

    // Controlled adjustment values (previously uncontrolled `defaultValue`s).
    const [brightness, setBrightness] = useState(8);
    const [contrast, setContrast] = useState(1.24);
    const [dotScale, setDotScale] = useState(6);
    const [matrixSize, setMatrixSize] = useState<MatrixSize>("8");

    const containerRef = useRef<HTMLDivElement>(null);
    const dropZoneRef = useRef<HTMLLabelElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const processFile = useCallback((file: File | undefined) => {
        if (!file || !file.type.startsWith("image/")) return;

        // Release the previous blob URL before creating a new one to avoid leaking memory.
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setImageSrc(url);
    }, []);

    // Clean up the last object URL if the component unmounts mid-session.
    useEffect(() => {
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        };
    }, []);

    const handleFileChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            processFile(e.target.files?.[0]);
            e.target.value = ""; // allow re-selecting the same file later
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
        // TODO: wire up the real export pipeline
        alert("Exporting execution payload...");
    }, []);

    // Respect reduced-motion preferences for every animation in this component.
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Entrance animation for the ingest (upload) state.
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

    // Entrance animation for the workspace (editing) state.
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

    // Subtle pulse on the drop zone while a file is dragged over it.
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
                /* ==================== STATE 01: SOURCE INGEST ==================== */
                <main className={styles.ingestContainer}>
                    <div className={styles.ingestHeader}>
                        <span className={styles.stageLabel}>STATE 01 / SOURCE INGEST</span>
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
                /* ==================== STATE 02: SHADER WORKSPACE ==================== */
                <main className={styles.workspaceContainer}>
                    <div className={styles.workspaceHeader}>
                        <div className={styles.headerTitleGroup}>
                            <span className={styles.stageLabel}>STATE 02 / ACTIVE FILTERING</span>
                            <h2 className={styles.mainTitle}>Shader workspace</h2>
                        </div>
                        <div className={styles.headerActions}>
                            <button className={styles.swapBtn} onClick={handleReturnToIngest}>
                                ← NEW SOURCE
                            </button>
                            <div className={styles.streamInfo}>SOURCE_RENDER.PNG / 16.7 MS / 60 FPS</div>
                        </div>
                    </div>

                    <div className={styles.workspaceGrid}>
                        <aside className={styles.controlSidebar}>
                            <div className={styles.sidebarHeader}>
                                <h3>ADJUSTMENTS</h3>
                                <button
                                    className={styles.resetBtn}
                                    onClick={() => {
                                        setBrightness(8);
                                        setContrast(1.24);
                                        setDotScale(6);
                                        setMatrixSize("8");
                                    }}
                                >
                                    RESET
                                </button>
                            </div>

                            <div className={styles.controlGroup}>
                                <div className={styles.controlLabelRow}>
                                    <label htmlFor="brightness">BRIGHTNESS</label>
                                    <span>{formatSigned(brightness)}</span>
                                </div>
                                <input
                                    id="brightness"
                                    type="range"
                                    min="-100"
                                    max="100"
                                    value={brightness}
                                    onChange={(e) => setBrightness(Number(e.target.value))}
                                    className={styles.slider}
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <div className={styles.controlLabelRow}>
                                    <label htmlFor="contrast">CONTRAST</label>
                                    <span>{contrast.toFixed(2)}</span>
                                </div>
                                <input
                                    id="contrast"
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.01"
                                    value={contrast}
                                    onChange={(e) => setContrast(Number(e.target.value))}
                                    className={styles.slider}
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <div className={styles.controlLabelRow}>
                                    <label htmlFor="dotScale">DOT SCALE</label>
                                    <span>{dotScale.toFixed(1)} PX</span>
                                </div>
                                <input
                                    id="dotScale"
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={dotScale}
                                    onChange={(e) => setDotScale(Number(e.target.value))}
                                    className={styles.slider}
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <div className={styles.controlLabelRow}>
                                    <label>THRESHOLD MATRIX</label>
                                    <span className={styles.accentText}>
                                        {matrixSize} × {matrixSize}
                                    </span>
                                </div>
                                <div className={styles.matrixSelectorGrid}>
                                    {MATRIX_SIZES.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setMatrixSize(size)}
                                            aria-pressed={matrixSize === size}
                                            className={`${styles.matrixBtn} ${
                                                matrixSize === size ? styles.activeMatrix : ""
                                            }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        <section className={styles.viewportArea}>
                            <div className={styles.viewportHeader}>
                                <span>PREVIEW / {activeFilter.toUpperCase()} PRINT</span>
                                <span className={styles.viewportScale}>FIT / 72% / 1:1</span>
                            </div>

                            <div className={styles.canvasContainer}>
                                <div className={styles.previewFrame}>
                                    <Image
                                        src={imageSrc}
                                        alt="Uploaded source image"
                                        fill
                                        unoptimized
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 60vw"
                                        className={styles.previewPlaceholder}
                                    />
                                </div>
                                <div className={styles.centerOverlayBadge}>
                                    {activeFilter.toUpperCase()}
                                    <span className={styles.subBadge}>GPU SHADER OUTPUT / 001</span>
                                </div>
                            </div>

                            <div className={styles.viewportFooter}>
                                <span>DISPLAY P3 / LINEAR</span>
                                <span>GPU 18% - VRAM 124 MB</span>
                            </div>
                        </section>
                    </div>

                    {/* Bottom Dock Menu Navigation Filters */}
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
                            <span>PNG / 4K / 16-BIT</span>
                            <strong>EXPORTED PAYLOAD</strong>
                        </div>
                    </nav>
                </main>
            )}
        </div>
    );
}