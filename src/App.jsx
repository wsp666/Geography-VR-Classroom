import React, { useState } from 'react';
import EarthLayer from './components/EarthLayer';
import VRLayer from './components/VRLayer';

function App() {
  const [activeScene, setActiveScene] = useState(null);
  // 新增：过渡遮罩的透明度状态 (0 = 透明, 1 = 全黑/全白)
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // 1. 开始转场：地球层通知我们要开始飞了
  const handleStartTransition = (sceneData) => {
    // 可以在这里做一些准备工作
  };

  // 2. 飞行结束：地球层通知我们相机已经贴脸了，可以切换 VR 了
  const handleTransitionComplete = (sceneData) => {
    // 瞬间拉起遮罩 (或者在飞行过程中渐变，这里我们用简单的瞬间全黑作为分界线)
    setOverlayOpacity(1);

    // 切换数据
    setActiveScene(sceneData);

    // 延时一小会儿，让 VR 组件挂载并开始渲染后，再淡出遮罩
    setTimeout(() => {
      setOverlayOpacity(0);
    }, 800); // 0.8秒后淡出，这时 VR 的小行星动画应该刚好开始
  };

  const handleCloseVR = () => {
    // 返回时也可以做一个简单的淡出淡入
    setOverlayOpacity(1);
    setTimeout(() => {
      setActiveScene(null);
      setOverlayOpacity(0);
    }, 500);
  };

  return (
    <div className="App" style={{ background: '#000' }}>

      {/* 🌍 地球层：传入两个回调 */}
      <EarthLayer
        onStartTransition={handleStartTransition}
        onTransitionComplete={handleTransitionComplete}
        // 如果进入 VR 模式，可以隐藏地球层以省性能，或者保持渲染作为背景
        active={activeScene === null}
      />

      {/* 🕶️ VR 层 */}
      {activeScene && (
        <VRLayer sceneData={activeScene} onClose={handleCloseVR} />
      )}

      {/* 🌫️ 过渡遮罩层 (Flash Overlay) */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000', // 或者用 'white' 模拟穿过亮云
        opacity: overlayOpacity,
        pointerEvents: 'none', // 确保不阻挡点击
        zIndex: 99999, // 最顶层
        transition: 'opacity 0.8s ease-in-out' // 丝滑的淡入淡出
      }} />
    </div>
  );
}

export default App;