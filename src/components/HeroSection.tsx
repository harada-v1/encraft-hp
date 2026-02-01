"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
    const [stressText, setStressText] = useState("");

    const handleThrow = useCallback(async () => {
        if (!physicsRef.current || !imeshRef.current) return;
        if (!stressText.trim()) return;

        // Insert into Supabase
        const seed = Math.floor(Math.random() * 1_000_000_000);
        const { error } = await supabase.from('stress_balls').insert({
            text: stressText,
            seed: seed
        });

        if (error) {
            console.error('Error throwing ball:', error);
            // Optional: Show UI error
            return;
        }

        // Add logic
        const maxY = physicsRef.current.config.maxY || 5;
        const idx = physicsRef.current.addBall(maxY);

        if (idx !== -1 && imeshRef.current) {
            const dummy = new THREE.Object3D();
            const threeColors = colors.map(c => new THREE.Color(c));
            // Use seed for consistency if wanted, but random is fine for visual here
            const color = threeColors[Math.floor(Math.random() * threeColors.length)];

            imeshRef.current.setColorAt(idx, color);
            // Position will be updated in next frame by physics update
            dummy.scale.setScalar(physicsRef.current.sizeData[idx]);
            dummy.position.fromArray(physicsRef.current.positionData, idx * 3);
            dummy.updateMatrix();
            imeshRef.current.setMatrixAt(idx, dummy.matrix);
            imeshRef.current.instanceColor!.needsUpdate = true;
            imeshRef.current.instanceMatrix.needsUpdate = true;

            // Reset text (simulating sending)
            setStressText("");
        }
    }, [colors, stressText]);

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
            physics.update(Math.min(delta, 0.1));

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
                    <div className="text-center space-y-2 pointer-events-auto">
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            ストレスボールを投げる
                        </h1>
                        <p className="text-gray-500 text-lg">
                            感じるストレスをボールに込めて投げてみよう
                        </p>
                    </div>

                    {/* Input Area */}
                    <div className="w-full bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50 flex gap-2 pointer-events-auto transition-transform hover:scale-[1.01]">
                        <textarea
                            value={stressText}
                            onChange={(e) => setStressText(e.target.value)}
                            placeholder="ここにストレスを書き込む..."
                            className="flex-1 bg-transparent border-none outline-none resize-none h-14 p-3 text-gray-700 placeholder:text-gray-400"
                        />
                        <button
                            onClick={handleThrow}
                            className="self-end px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                            <span>投げる</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
