import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'; // 👈 新增 useThree
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { latLongToVector3 } from '../utils/math';

// --- 纹理素材 ---
const EARTH_MAP = '/textures/earth-blue-marble.jpg';
const EARTH_BUMP = '/textures/earth-topology.png';
const CLOUDS_MAP = '/textures/earth-clouds.png';

const SCENES = [
    { id: 1, name: '纽约', lat: 40.7, lon: -74.0, pano: '/vr_images/sphere.jpg' },
    { id: 2, name: '重庆', lat: 29.56, lon: 106.55, pano: '/vr_images/chongqing.jpg' },
    { id: 3, name: '伦敦', lat: 51.5, lon: -0.12, pano: '/vr_images/sphere.jpg' },
    { id: 4, name: '巴黎', lat: 48.8566, lon: 2.3522, pano: '/vr_images/pexels-pixabay.jpg' },
];

const RealisticEarth = ({ radius = 2.5, onStartTransition, onTransitionComplete, active }) => {
    const earthGroupRef = useRef();
    const earthMeshRef = useRef();
    const cloudsRef = useRef();

    const isRotating = useRef(true);

    // 1. 获取 Three.js 的核心实例
    const { camera, controls } = useThree();

    const [colorMap, bumpMap, cloudsMap] = useLoader(THREE.TextureLoader, [
        EARTH_MAP, EARTH_BUMP, CLOUDS_MAP
    ]);

    // 🌍 核心动画逻辑：点击标记后的飞行效果
    const handleMarkerClick = (scene) => {
        isRotating.current = false;
        // 通知父级：动画开始（父级可以此时显示白色遮罩的初始状态）
        if (onStartTransition) onStartTransition(scene);

        // A. 先算本地坐标 (Local Position)
        const localPos = latLongToVector3(scene.lat, scene.lon, radius);

        // B. 关键一步：将本地坐标转换为世界坐标！
        // 我们需要把地球当前的旋转 (MatrixWorld) 应用到这个点上
        const worldPos = localPos.clone().applyMatrix4(earthGroupRef.current.matrixWorld);

        // 3. 计算相机目标位置 (Standing at)
        // 基于世界坐标向外延伸，而不是基于本地坐标
        const endDist = radius + 0.5; // 距离地表 0.5
        const targetCameraPos = worldPos.clone().normalize().multiplyScalar(endDist);

        if (controls) controls.enabled = false;

        const tl = gsap.timeline({
            onComplete: () => {
                if (controls) controls.enabled = true;
                if (onTransitionComplete) onTransitionComplete(scene);
            }
        });

        // 4. 动画：飞向计算好的【世界坐标】
        tl.to(camera.position, {
            x: targetCameraPos.x,
            y: targetCameraPos.y,
            z: targetCameraPos.z,
            duration: 1.5,
            ease: "power2.inOut"
        }, 0);

        // 5. 动画：让控制器盯着【世界坐标】
        if (controls) {
            tl.to(controls.target, {
                x: worldPos.x,
                y: worldPos.y,
                z: worldPos.z,
                duration: 1.5,
                ease: "power2.inOut"
            }, 0);
        }
    };

    React.useEffect(() => {
        // 如果 active 变为 true (说明刚从 VR 回来)，且控制器存在
        if (active && controls) {
            console.log("🚀 返回地球，复位相机...");

            isRotating.current = true;
            // 创建复位动画
            const tl = gsap.timeline();

            // 1. 把旋转中心 (Target) 移回地心 (0,0,0) !!! 核心修复点 !!!
            tl.to(controls.target, {
                x: 0,
                y: 0,
                z: 0,
                duration: 1.5,
                ease: "power2.inOut"
            }, 0);

            // 2. 把相机拉远回太空 (比如 Z=8 的位置)
            // 注意：这里我们假设初始视角是 (0, 0, 8)，你可以根据需要调整
            tl.to(camera.position, {
                x: 0,
                y: 0,
                z: 8,
                duration: 1.5,
                ease: "power2.inOut",
                onComplete: () => {
                    controls.enabled = true; // 确保控制器解锁
                }
            }, 0);
        }
    }, [active, camera, controls]); // 依赖 active

    useFrame(({ clock }) => {
        const elapsedTime = clock.getElapsedTime();
        
        if (earthGroupRef.current && isRotating.current) {
            earthGroupRef.current.rotation.y = elapsedTime / 20;
        }
        if (cloudsRef.current && isRotating.current) {
            cloudsRef.current.rotation.y = elapsedTime / 15;
        }
    });

    return (
        <group>
            {/* 🌍 地球组 */}
            <group ref={earthGroupRef}>
                {/* 地球本体 */}
                <mesh ref={earthMeshRef}>
                    <sphereGeometry args={[radius, 64, 64]} />
                    <meshPhongMaterial
                        map={colorMap}
                        bumpMap={bumpMap}
                        bumpScale={0.06}
                        specular={new THREE.Color(0x333333)}
                        shininess={10}
                    />
                </mesh>

                {/* 📍 使用 Html 组件作为标记 */}
                {SCENES.map((scene) => {
                    const pos = latLongToVector3(scene.lat, scene.lon, radius);
                    return (
                        <Html
                            key={scene.id}
                            position={pos}
                            occlude={[earthMeshRef]}
                            center
                            style={{
                                transition: 'all 0.2s',
                                opacity: 1,
                                transform: 'scale(1)',
                            }}
                        >
                            <div
                                className="scene-marker"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // 👈 这里改为调用动画处理函数
                                    handleMarkerClick(scene);
                                }}
                            >
                                <div className="marker-dot"></div>
                                <div className="marker-label">{scene.name}</div>
                            </div>
                        </Html>
                    );
                })}
            </group>

            {/* ☁️ 云层 */}
            <mesh ref={cloudsRef}>
                <sphereGeometry args={[radius * 1.01, 64, 64]} />
                <meshPhongMaterial
                    map={cloudsMap} transparent opacity={0.8}
                    blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false}
                />
            </mesh>

            {/* 🌟 大气 */}
            <mesh>
                <sphereGeometry args={[radius * 1.025, 64, 64]} />
                <meshPhongMaterial color="#0088ff" transparent opacity={0.15} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    );
};

// 这里的 props 变了，记得在 App.jsx 里也要改
export default function EarthLayer({ onStartTransition, onTransitionComplete, active }) {
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1 }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                onCreated={({ gl }) => {
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                }}
            >
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 3, 5]} intensity={1.5} />

                <RealisticEarth
                    active={active}
                    onStartTransition={onStartTransition}
                    onTransitionComplete={onTransitionComplete}
                />

                <OrbitControls
                    makeDefault // 👈 关键：加上这个，RealisticEarth 里的 useThree().controls 才能拿到它
                    enablePan={false}
                    minDistance={3}
                    maxDistance={15}
                    enableDamping={true}
                    dampingFactor={0.05}
                />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
            </Canvas>
        </div>
    );
}