import React, { useEffect, useRef } from 'react';
import { Viewer, utils } from '@photo-sphere-viewer/core';
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';

// 定义动画参数配置 (从小行星 -> 正常视角)
const animatedValues = {
    pitch: { start: -Math.PI / 2, end: 0 },
    yaw: { start: Math.PI / 2, end: 0 },
    zoom: { start: 0, end: 50 },
    maxFov: { start: 130, end: 90 },
    fisheye: { start: 2, end: 0 },
};

export default function VRLayer({ sceneData, onClose }) {
    const viewerContainerRef = useRef(null);
    const psvInstance = useRef(null);
    const autorotatePluginRef = useRef(null);

    useEffect(() => {
        if (!viewerContainerRef.current || !sceneData) return;
        
        // 1. 初始化 Viewer (使用 Start 值，锁定交互)
        const viewer = new Viewer({
            container: viewerContainerRef.current,
            panorama: sceneData.pano,
            caption: sceneData.name,
            loadingImg: null,
            requestHeaders: {
                'Cache-Control': 'no-cache', // 有时候缓存会导致跨域误判
            },

            // 初始状态：小行星模式
            defaultPitch: animatedValues.pitch.start,
            defaultYaw: animatedValues.yaw.start,
            defaultZoomLvl: animatedValues.zoom.start,
            maxFov: animatedValues.maxFov.start,
            fisheye: animatedValues.fisheye.start,

            // 禁止初始交互
            mousemove: false,
            mousewheel: false,

            navbar: ['autorotate', 'zoom', 'caption', 'fullscreen'],

            plugins: [
                [AutorotatePlugin, {
                    autostartDelay: null,
                    autostartOnIdle: false,
                    autorotatePitch: 0,
                }],
                [MarkersPlugin, { markers: [] }]
            ]
        });

        psvInstance.current = viewer;
        autorotatePluginRef.current = viewer.getPlugin(AutorotatePlugin);

        // 2. 监听 Ready 事件，触发入场动画
        viewer.addEventListener('ready', () => {
            // 隐藏导航栏，直到动画结束
            viewer.navbar.hide();

            // 播放入场动画
            playIntroAnimation(viewer);
        }, { once: true });

        // 清理函数
        return () => {
            if (psvInstance.current) {
                psvInstance.current.destroy();
            }
        };
    }, [sceneData]);

    // --- 动画逻辑 ---

    const playIntroAnimation = (viewer) => {
        new utils.Animation({
            properties: {
                ...animatedValues,
                // 这里可以动态设置终点，比如指向某个特定角度
                pitch: { start: animatedValues.pitch.start, end: 0 },
                yaw: { start: animatedValues.yaw.start, end: 0 },
            },
            duration: 2500,
            easing: 'inOutQuad',
            onTick: (properties) => {
                viewer.setOptions({
                    fisheye: properties.fisheye,
                    maxFov: properties.maxFov,
                });
                viewer.rotate({ yaw: properties.yaw, pitch: properties.pitch });
                viewer.zoom(properties.zoom);
            },
        }).then(() => {
            // 动画结束：解锁交互，显示 UI，开始自动旋转
            if (autorotatePluginRef.current) autorotatePluginRef.current.start();
            viewer.navbar.show();
            viewer.setOptions({
                mousemove: true,
                mousewheel: true,
            });
        });
    };

    const handleBackClick = () => {
        const viewer = psvInstance.current;
        if (!viewer) {
            onClose();
            return;
        }

        // 3. 离场动画 (Outro)
        // 停止自动旋转，隐藏 UI
        if (autorotatePluginRef.current) autorotatePluginRef.current.stop();
        viewer.navbar.hide();
        viewer.setOptions({
            mousemove: false,
            mousewheel: false,
        });

        // 执行反向动画
        new utils.Animation({
            properties: {
                pitch: { start: viewer.getPosition().pitch, end: animatedValues.pitch.start },
                yaw: { start: viewer.getPosition().yaw, end: animatedValues.yaw.start },
                zoom: { start: viewer.getZoomLevel(), end: animatedValues.zoom.start },
                maxFov: { start: animatedValues.maxFov.end, end: animatedValues.maxFov.start },
                fisheye: { start: animatedValues.fisheye.end, end: animatedValues.fisheye.start },
            },
            duration: 1500,
            easing: 'inOutQuad',
            onTick: (properties) => {
                viewer.setOptions({
                    fisheye: properties.fisheye,
                    maxFov: properties.maxFov,
                });
                viewer.rotate({ yaw: properties.yaw, pitch: properties.pitch });
                viewer.zoom(properties.zoom);
            },
        }).then(() => {
            // 动画完全结束后，才调用父组件的 onClose 销毁组件
            onClose();
        });
    };

    return (
        <div className="vr-container" style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 10, background: 'black'
        }}>
            <div ref={viewerContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* 自定义返回按钮 */}
            <button
                onClick={handleBackClick}
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 100, // 确保在 Viewer 之上
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(5px)',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.4)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
                🔙 返回地球
            </button>
        </div>
    );
}