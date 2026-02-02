"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendGAEvent } from '@next/third-parties/google';

// --- Custom Material (Same as Phase A) ---
class PhysicalScatteringMaterial extends THREE.MeshPhysicalMaterial {
    uniforms: { [key: string]: { value: any } } = {
        thicknessDistortion: { value: 0.1 },
        thicknessAmbient: { value: 0 },
        thicknessAttenuation: { value: 0.1 },
        thicknessPower: { value: 2 },
        thicknessScale: { value: 10 }
    };

    constructor(params: THREE.MeshPhysicalMaterialParameters) {
        super(params);
        this.defines = { USE_UV: '' };
        this.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.uniforms);
            shader.fragmentShader = `
        uniform float thicknessPower;
        uniform float thicknessScale;
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
        ${shader.fragmentShader}
      `;
            shader.fragmentShader = shader.fragmentShader.replace(
                'void main() {',
                `
        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          #ifdef USE_COLOR
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;
          #else
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;
          #endif
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }
        void main() {
        `
            );
            const lightsChunk = THREE.ShaderChunk.lights_fragment_begin.replaceAll(
                'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
                `
          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);
        `
            );
            shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', lightsChunk);
        };
    }
}

// --- Physics Engine (Modified for Dynamic Addition) ---
class PhysicsWorld {
    config: HeroSectionProps;
    positionData: Float32Array;
    velocityData: Float32Array;
    sizeData: Float32Array;
    activeCount: number;
    center: THREE.Vector3 = new THREE.Vector3();

    constructor(config: HeroSectionProps, maxCount: number, initialCount: number) {
        this.config = config;
        this.activeCount = initialCount;

        // Pre-allocate for maxCount
        this.positionData = new Float32Array(3 * maxCount).fill(0);
        this.velocityData = new Float32Array(3 * maxCount).fill(0);
        this.sizeData = new Float32Array(maxCount).fill(1);

        this.initialize(initialCount);
    }

    initialize(count: number) {
        const maxX = this.config.maxX || 5;
        const maxY = this.config.maxY || 5;
        const maxZ = this.config.maxZ || 2;
        const minSize = this.config.minSize || 0.5;
        const maxSize = this.config.maxSize || 1;

        for (let i = 0; i < count; i++) {
            const idx = 3 * i;
            if (i === 0 && this.config.followCursor) {
                this.positionData[idx] = 0;
                this.positionData[idx + 1] = 0;
                this.positionData[idx + 2] = 0;
                this.sizeData[i] = maxSize * 1.2;
            } else {
                this.positionData[idx] = THREE.MathUtils.randFloatSpread(2 * maxX);
                this.positionData[idx + 1] = THREE.MathUtils.randFloatSpread(2 * maxY);
                this.positionData[idx + 2] = THREE.MathUtils.randFloatSpread(2 * maxZ);
                this.sizeData[i] = THREE.MathUtils.randFloat(minSize, maxSize);
            }
        }
    }

    addBall(maxY: number) {
        if (this.activeCount >= this.positionData.length / 3) return -1; // Full

        const idx = this.activeCount;
        const base = 3 * idx;

        // Spawn at top
        const maxX = this.config.maxX || 5;
        this.positionData[base] = THREE.MathUtils.randFloatSpread(maxX);
        this.positionData[base + 1] = maxY + 2; // Above the container
        this.positionData[base + 2] = THREE.MathUtils.randFloatSpread(2); // Random Z

        this.velocityData[base] = 0;
        this.velocityData[base + 1] = -0.1; // Initial downward velocity
        this.velocityData[base + 2] = 0;

        this.sizeData[idx] = THREE.MathUtils.randFloat(this.config.minSize || 0.5, this.config.maxSize || 1);

        this.activeCount++;
        return idx;
    }

    update(delta: number) {
        const gravity = this.config.gravity ?? 0.5;
        const friction = this.config.friction ?? 0.9975;
        const wallBounce = this.config.wallBounce ?? 0.95;
        const maxVelocity = this.config.maxVelocity ?? 0.15;
        const maxX = this.config.maxX || 5;
        const maxY = this.config.maxY || 5;
        const maxZ = this.config.maxZ || 2;
        const followCursor = this.config.followCursor ?? true;

        // First sphere (index 0) is the "follower" if enabled
        let startIdx = 0;
        if (followCursor) {
            startIdx = 1;
            const firstPos = new THREE.Vector3().fromArray(this.positionData, 0);
            firstPos.lerp(this.center, 0.1).toArray(this.positionData, 0);
            new THREE.Vector3(0, 0, 0).toArray(this.velocityData, 0);
        }

        for (let i = startIdx; i < this.activeCount; i++) {
            const base = 3 * i;
            const pos = new THREE.Vector3().fromArray(this.positionData, base);
            const vel = new THREE.Vector3().fromArray(this.velocityData, base);
            const radius = this.sizeData[i];

            // Gravity & Velocity
            vel.y -= delta * gravity * radius;
            vel.multiplyScalar(friction);
            vel.clampLength(0, maxVelocity);
            pos.add(vel);

            // Collisions with other spheres (active only)
            for (let j = i + 1; j < this.activeCount; j++) {
                const otherBase = 3 * j;
                const otherPos = new THREE.Vector3().fromArray(this.positionData, otherBase);
                const diff = new THREE.Vector3().copy(otherPos).sub(pos);
                const dist = diff.length();
                const sumRadius = radius + this.sizeData[j];

                if (dist < sumRadius) {
                    const overlap = sumRadius - dist;
                    const correction = diff.normalize().multiplyScalar(0.5 * overlap);
                    pos.sub(correction);
                    otherPos.add(correction);

                    const relVel = new THREE.Vector3().fromArray(this.velocityData, otherBase).sub(vel);
                    const impulse = correction.clone().multiplyScalar(relVel.dot(correction.normalize()));
                    vel.add(impulse);

                    otherPos.toArray(this.positionData, otherBase);
                }
            }

            // Interaction with follower sphere
            if (followCursor) {
                const followerPos = new THREE.Vector3().fromArray(this.positionData, 0);
                const diff = new THREE.Vector3().copy(followerPos).sub(pos);
                const d = diff.length();
                const sumRadius = radius + this.sizeData[0];
                if (d < sumRadius) {
                    const correction = diff.normalize().multiplyScalar(sumRadius - d);
                    pos.sub(correction);
                    vel.sub(correction.multiplyScalar(0.2));
                }
            }

            // Boundary Collisions
            if (Math.abs(pos.x) + radius > maxX) {
                pos.x = Math.sign(pos.x) * (maxX - radius);
                vel.x *= -wallBounce;
            }
            if (pos.y - radius < -maxY) {
                pos.y = -maxY + radius;
                vel.y *= -wallBounce;
            }
            // No ceiling collision for falling effect check? -> stick to updated bounds
            // If gravity is 0, we might need ceiling. But here we have gravity.
            if (Math.abs(pos.z) + radius > maxZ) {
                pos.z = Math.sign(pos.z) * (maxZ - radius);
                vel.z *= -wallBounce;
            }

            pos.toArray(this.positionData, base);
            vel.toArray(this.velocityData, base);
        }
    }
}

// --- Main Interface ---
export interface HeroSectionProps {
    maxCount?: number;
    initialCount?: number;
    colors?: string[];
    gravity?: number;
    friction?: number;
    wallBounce?: number;
    maxVelocity?: number;
    maxX?: number;
    maxY?: number;
    maxZ?: number;
    followCursor?: boolean;
    minSize?: number;
    maxSize?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    maxCount = 300,
    initialCount = 100,
    colors = ['#1A1A1B', '#3B82F6', '#94A3B8'],
    gravity = 0.5,
    friction = 0.9975,
    wallBounce = 0.95,
    maxVelocity = 0.15,
    followCursor = true,
    minSize = 0.5,
    maxSize = 1,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const physicsRef = useRef<PhysicsWorld | null>(null);
    const imeshRef = useRef<THREE.InstancedMesh | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const newBallsRef = useRef<{ id: number, birth: number }[]>([]);
    const [stressText, setStressText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCooldown, setIsCooldown] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // New UI State (v1)
    const [newBallTags, setNewBallTags] = useState<{ id: number, x: number, y: number, opacity: number }[]>([]);
    const [hasThrownOnce, setHasThrownOnce] = useState(false);
    const [showProductsGuide, setShowProductsGuide] = useState(false);
    const [backgroundLightness, setBackgroundLightness] = useState(1.0); // 1.0 = normal, < 1.0 = light/slow
    const lightnessRef = useRef(1.0);
    useEffect(() => { lightnessRef.current = backgroundLightness; }, [backgroundLightness]);

    const handleThrow = useCallback(async () => {
        if (!physicsRef.current || !imeshRef.current) return;
        if (isSubmitting || isCooldown) return;

        const trimmedText = stressText.trim();

        // Front-end Validation
        if (!trimmedText) {
            setErrorMessage("内容を入力してください");
            return;
        }
        if (trimmedText.length > 500) {
            setErrorMessage("文字数が多すぎます");
            return;
        }

        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            // Throw via RPC
            const { data, error } = await supabase.rpc("throw_stress_ball", {
                p_text: trimmedText
            });

            // returns table -> data is array. Success if error is null and data has items.
            if (error || !data || (Array.isArray(data) && data.length === 0)) {
                console.error('Error throwing ball:', error);

                // Handle specific error messages from PostgreSQL
                const msg = error?.message || "";
                if (msg.includes("text_required")) {
                    setErrorMessage("内容を入力してください");
                } else if (msg.includes("text_too_long")) {
                    setErrorMessage("文字数が多すぎます");
                } else if (msg.includes("rate_limited")) {
                    setErrorMessage("少し時間を置いてください");
                } else {
                    setErrorMessage("送信に失敗しました。少し時間を置いて再度お試しください。");
                }
                setIsSubmitting(false);
                return;
            }

            // Success Behavior
            const maxY = physicsRef.current.config.maxY || 5;
            const idx = physicsRef.current.addBall(maxY);

            if (idx !== -1 && imeshRef.current) {
                const dummy = new THREE.Object3D();
                const threeColors = colors.map(c => new THREE.Color(c));
                const color = threeColors[Math.floor(Math.random() * threeColors.length)];

                imeshRef.current.setColorAt(idx, color);
                dummy.scale.setScalar(physicsRef.current.sizeData[idx]);
                dummy.position.fromArray(physicsRef.current.positionData, idx * 3);
                dummy.updateMatrix();
                imeshRef.current.setMatrixAt(idx, dummy.matrix);
                imeshRef.current.instanceColor!.needsUpdate = true;
                imeshRef.current.instanceMatrix.needsUpdate = true;

                // --- Effect B: Background Lightness ---
                setBackgroundLightness(0.9); // Subtle slowdown (90%)
                setTimeout(() => setBackgroundLightness(1.0), 1000); // Duration 1s

                // --- Effect A: Seed Tag Tracking ---
                newBallsRef.current.push({ id: idx, birth: Date.now() });

                // Flash effect for the new ball
                // We can't easily flash one instance without custom shader or temporary object.
                // For now, let's use the color to flash briefly.
                const flashColor = new THREE.Color("#FFFFFF");
                imeshRef.current.setColorAt(idx, flashColor);
                imeshRef.current.instanceColor!.needsUpdate = true;
                setTimeout(() => {
                    if (imeshRef.current) {
                        imeshRef.current.setColorAt(idx, color);
                        imeshRef.current.instanceColor!.needsUpdate = true;
                    }
                }, 350);

                // --- Effect C: Products Guide ---
                if (!hasThrownOnce) {
                    setHasThrownOnce(true);
                    setTimeout(() => setShowProductsGuide(true), 2500);
                }

                // Send GA4 Event
                sendGAEvent({ event: "throw_gravity", params: { source: "hero" } });

                // Reset text
                setStressText("");
            }

            // Start Cooldown (3 seconds)
            setIsCooldown(true);
            setTimeout(() => {
                setIsCooldown(false);
            }, 3000);

        } catch (err) {
            console.error('Unexpected error throwing ball:', err);
            setErrorMessage("予期せぬエラーが発生しました。");
        } finally {
            setIsSubmitting(false);
        }
    }, [colors, stressText, isSubmitting, isCooldown]);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const parent = containerRef.current;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const roomEnv = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTexture = pmrem.fromScene(roomEnv).texture;

        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
        camera.position.z = 20;
        cameraRef.current = camera;

        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new PhysicalScatteringMaterial({
            envMap: envTexture,
            metalness: 0.5,
            roughness: 0.5,
            clearcoat: 1,
            clearcoatRoughness: 0.15
        });

        const imesh = new THREE.InstancedMesh(geometry, material, maxCount);
        imeshRef.current = imesh;
        scene.add(imesh);

        const ambient = new THREE.AmbientLight('#ffffff', 1);
        scene.add(ambient);
        const pointLight = new THREE.PointLight(colors[0], 200);
        scene.add(pointLight);

        const config = {
            maxCount, initialCount, gravity, friction, wallBounce,
            maxVelocity, followCursor, minSize, maxSize, maxX: 5, maxY: 5, maxZ: 2
        };
        const physics = new PhysicsWorld(config, maxCount, initialCount);
        physicsRef.current = physics;

        const threeColors = colors.map(c => new THREE.Color(c));
        const dummy = new THREE.Object3D();

        // Init Colors & Matrices
        for (let i = 0; i < maxCount; i++) {
            const color = threeColors[i % threeColors.length];
            imesh.setColorAt(i, color);

            // Initialize active ones
            if (i < initialCount) {
                dummy.scale.setScalar(physics.sizeData[i]);
                dummy.position.fromArray(physics.positionData, i * 3);
            } else {
                dummy.scale.setScalar(0); // Hide inactive
            }
            dummy.updateMatrix();
            imesh.setMatrixAt(i, dummy.matrix);
        }
        imesh.instanceColor!.needsUpdate = true;
        imesh.instanceMatrix.needsUpdate = true;

        // Raycasting
        const raycaster = new THREE.Raycaster();
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        const pointer = new THREE.Vector2();

        const updatePointer = (e: MouseEvent | TouchEvent) => {
            const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const rect = canvas.getBoundingClientRect();
            pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((y - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(pointer, camera);
            raycaster.ray.intersectPlane(plane, intersection);
            physics.center.copy(intersection);
        };

        // Use parent container for events to avoid global listener issues if possible
        // But 'window' is safer for drag. Let's use window for now as per ref.
        window.addEventListener('mousemove', updatePointer);
        window.addEventListener('touchstart', updatePointer);
        window.addEventListener('touchmove', updatePointer);

        // Resize
        const resize = () => {
            const w = parent.offsetWidth;
            const h = parent.offsetHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();

            const fovRad = (camera.fov * Math.PI) / 180;
            const wHeight = 2 * Math.tan(fovRad / 2) * camera.position.z;
            const wWidth = wHeight * camera.aspect;
            physics.config.maxX = wWidth / 2;
            physics.config.maxY = wHeight / 2;
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(parent);
        resize();

        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            const delta = clock.getDelta();

            // Apply background lightness (slowdown) & upward drift
            const speedFactor = lightnessRef.current;
            const currentDelta = Math.min(delta * speedFactor, 0.1);

            // If speedFactor < 1 (active effect), slightly decrease gravity to feel lighter
            if (speedFactor < 1.0) {
                const originalGravity = physics.config.gravity ?? 0.5;
                physics.config.gravity = originalGravity * 0.5; // Half gravity temporarily
                physics.update(currentDelta);
                physics.config.gravity = originalGravity; // Restore
            } else {
                physics.update(currentDelta);
            }

            // Update New Ball Tags (2D Projection)
            if (newBallsRef.current.length > 0) {
                const now = Date.now();
                const tags: any[] = [];
                newBallsRef.current = newBallsRef.current.filter(b => {
                    const age = now - b.birth;
                    if (age > 12000) return false; // Max 12s

                    if (age > 500) { // Show after 0.5s
                        const pos = new THREE.Vector3().fromArray(physics.positionData, b.id * 3);
                        pos.project(camera);

                        const x = (pos.x * 0.5 + 0.5) * parent.offsetWidth;
                        const y = (-pos.y * 0.5 + 0.5) * parent.offsetHeight;

                        // Opacity fade out
                        let opacity = 1.0;
                        if (age > 8000) {
                            opacity = 1.0 - (age - 8000) / 4000;
                        }

                        tags.push({ id: b.id, x, y, opacity });
                    }
                    return true;
                });
                setNewBallTags(tags);
            } else if (newBallTags.length > 0) {
                setNewBallTags([]);
            }

            for (let i = 0; i < maxCount; i++) {
                const dummy = new THREE.Object3D();
                if (i < physics.activeCount) {
                    dummy.position.fromArray(physics.positionData, i * 3);

                    // First index special handling if followCursor
                    if (i === 0 && !followCursor) {
                        dummy.scale.setScalar(0);
                    } else {
                        dummy.scale.setScalar(physics.sizeData[i]);
                    }

                    if (i === 0) pointLight.position.copy(dummy.position);
                } else {
                    dummy.scale.setScalar(0);
                }

                dummy.updateMatrix();
                imesh.setMatrixAt(i, dummy.matrix);
            }
            imesh.instanceMatrix.needsUpdate = true;
            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('mousemove', updatePointer);
            window.removeEventListener('touchstart', updatePointer);
            window.removeEventListener('touchmove', updatePointer);
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            pmrem.dispose();
            roomEnv.dispose();
        };
    }, [colors, followCursor, friction, gravity, initialCount, maxCount, maxSize, maxVelocity, minSize, wallBounce]);

    return (
        <div ref={containerRef} className="relative w-full h-[520px] bg-[#F9F9F9] overflow-hidden">
            {/* Background Layer */}
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full outline-none z-0" />

            {/* Overlay UI Layer */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-lg px-6 flex flex-col items-center gap-6">

                    {/* Headers */}
                    <div className="text-center space-y-4 pointer-events-auto">
                        <h1 className="text-4xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-gray-900 via-gray-800 to-gray-600 leading-tight">
                            内面の重力を、<br className="md:hidden" />投げて軽くする。
                        </h1>
                        <div className="max-w-md mx-auto space-y-2">
                            <p className="text-gray-500 text-base md:text-lg leading-relaxed">
                                迷いも、希望も、言葉にならない違和感も。<br />
                                抱えたままでは重たいものを、ここに投げてください。
                            </p>
                            <p className="text-gray-400 text-sm italic">
                                すぐに答えは出なくても、少し軽くなる。<br />
                                そしてその重力は、いつか「解決に向かう形」に変わるかもしれません。
                            </p>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="w-full flex flex-col gap-2 relative">
                        <div className="w-full bg-white/90 backdrop-blur-lg p-2 rounded-3xl shadow-2xl border border-white/50 flex gap-2 pointer-events-auto transition-all hover:shadow-blue-500/5 group">
                            <textarea
                                value={stressText}
                                onChange={(e) => {
                                    setStressText(e.target.value);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                placeholder="いま重たく感じていることを書いてください&#10;（あとで形に変えられます）"
                                className="flex-1 bg-transparent border-none outline-none resize-none h-16 p-4 text-gray-700 placeholder:text-gray-400 leading-snug"
                                disabled={isSubmitting}
                            />
                            <button
                                onClick={handleThrow}
                                disabled={isSubmitting || isCooldown}
                                className={`self-end mb-2 mr-2 px-8 py-4 font-bold rounded-2xl transition-all flex items-center gap-2 shadow-lg ${isSubmitting || isCooldown
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gray-900 hover:bg-blue-600 active:bg-blue-700 text-white hover:-translate-y-0.5"
                                    }`}
                            >
                                <Send className={`w-5 h-5 ${isSubmitting ? "animate-pulse" : ""}`} />
                                <span className="tracking-widest">{isCooldown ? "充填中" : "投げる"}</span>
                            </button>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                                {errorMessage}
                            </div>
                        )}

                        {/* Character Count */}
                        <div className="flex justify-end px-2">
                            <span className={`text-xs ${stressText.length > 500 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                                {stressText.length} / 500
                            </span>
                        </div>
                    </div>
                </div>

                {/* Effect A: Seed Tags (2D Overlay) */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                    {newBallTags.map(tag => (
                        <div
                            key={tag.id}
                            style={{
                                left: tag.x,
                                top: tag.y,
                                opacity: tag.opacity,
                                transform: 'translate(-50%, -120%)'
                            }}
                            className="absolute bg-white/40 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded text-[10px] text-gray-500/80 font-bold tracking-tighter"
                        >
                            種
                        </div>
                    ))}
                </div>

                {/* Effect C: Products Guide */}
                {showProductsGuide && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <button
                            onClick={() => {
                                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="flex flex-col items-center gap-2 pointer-events-auto group animate-in fade-in slide-in-from-bottom-4 duration-1000"
                        >
                            <span className="text-gray-400 text-sm font-medium group-hover:text-blue-500 transition-colors">
                                種を、形にする道具を見る ↓
                            </span>
                            <div className="animate-bounce text-gray-300 group-hover:text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
