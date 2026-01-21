import { Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import LevelPlayer from './pages/LevelPlayer'
import LevelIntro from './pages/LevelIntro'

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Welcome />} />
			<Route path="/dashboard" element={<Dashboard />} />
			<Route path="/level/:id/intro" element={<LevelIntro />} />
			<Route path="/level/:id" element={<LevelPlayer />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	)
}

//mapping for gamepad
// import React, { useEffect, useState } from "react";

// export default function App() {
//   const [gamepadInfo, setGamepadInfo] = useState({
//     connected: false,
//     id: "",
//     axes: [],
//     buttons: [],
//   });

//   useEffect(() => {
//     const handleConnect = (e) => {
//       console.log("✅ Gamepad connected:", e.gamepad.id);
//       setGamepadInfo((prev) => ({
//         ...prev,
//         connected: true,
//         id: e.gamepad.id,
//       }));
//     };

//     const handleDisconnect = (e) => {
//       console.log("❌ Gamepad disconnected:", e.gamepad.id);
//       setGamepadInfo({
//         connected: false,
//         id: "",
//         axes: [],
//         buttons: [],
//       });
//     };

//     window.addEventListener("gamepadconnected", handleConnect);
//     window.addEventListener("gamepaddisconnected", handleDisconnect);

//     const update = () => {
//       const gamepads = navigator.getGamepads();
//       if (gamepads[0]) {
//         const gp = gamepads[0];
//         setGamepadInfo({
//           connected: true,
//           id: gp.id,
//           axes: gp.axes.map((a) => a.toFixed(2)),
//           buttons: gp.buttons.map((b) => (b.pressed ? "1" : "0")),
//         });
//       }
//       requestAnimationFrame(update);
//     };

//     update();

//     return () => {
//       window.removeEventListener("gamepadconnected", handleConnect);
//       window.removeEventListener("gamepaddisconnected", handleDisconnect);
//     };
//   }, []);

//   return (
//     <div className="p-6 text-white bg-gray-900 min-h-screen">
//       <h1 className="text-2xl font-bold mb-4">🎮 PXN V9 Gamepad Test</h1>

//       {gamepadInfo.connected ? (
//         <div>
//           <p className="mb-2">✅ Connected: {gamepadInfo.id}</p>

//           <h2 className="text-lg font-semibold mt-4">Axes</h2>
//           <ul className="list-disc ml-6">
//             {gamepadInfo.axes.map((val, i) => (
//               <li key={i}>
//                 Axis {i}: <span className="text-green-400">{val}</span>
//               </li>
//             ))}
//           </ul>

//           <h2 className="text-lg font-semibold mt-4">Buttons</h2>
//           <ul className="list-disc ml-6 grid grid-cols-4 gap-2">
//             {gamepadInfo.buttons.map((val, i) => (
//               <li key={i}>
//                 Btn {i}: <span className="text-yellow-400">{val}</span>
//               </li>
//             ))}
//           </ul>
//         </div>
//       ) : (
//         <p className="text-red-400">❌ No Gamepad connected</p>
//       )}
//     </div>
//   );
// }

//mapping with only required keys

// import React, { useEffect, useState } from "react";

// export default function App() {
//   const [controls, setControls] = useState({
//     steering: "Centered",
//     accelerator: "Not pressed",
//     brake: "Not pressed",
//     rightIndicator: "Off",
//     leftIndicator: "Off",
//   });

//   useEffect(() => {
//     const update = () => {
//       const gamepads = navigator.getGamepads();
//       if (gamepads[0]) {
//         const gp = gamepads[0];

//         // Axis 0 -> Steering
//         let steeringState = "Centered";
//         if (gp.axes[0] < -0.2) steeringState = "Turning Left";
//         else if (gp.axes[0] > 0.2) steeringState = "Turning Right";

//         // Buttons
//         const acceleratorState = gp.buttons[7].pressed ? "Pressed" : "Not pressed";
//         const brakeState = gp.buttons[6].pressed ? "Pressed" : "Not pressed";
//         const rightIndState = gp.buttons[3].pressed ? "On" : "Off";
//         const leftIndState = gp.buttons[1].pressed ? "On" : "Off";

//         setControls({
//           steering: steeringState,
//           accelerator: acceleratorState,
//           brake: brakeState,
//           rightIndicator: rightIndState,
//           leftIndicator: leftIndState,
//         });
//       }
//       requestAnimationFrame(update);
//     };

//     update();
//   }, []);

//   return (
//     <div className="p-6 text-white bg-gray-900 min-h-screen flex flex-col items-center justify-center">
//       <h1 className="text-2xl font-bold mb-6">🚗 PXN V9 Control Test</h1>

//       <div className="grid gap-4 text-lg">
//         <p>🛞 Steering: <span className="text-green-400">{controls.steering}</span></p>
//         <p>⚡ Accelerator: <span className="text-yellow-400">{controls.accelerator}</span></p>
//         <p>🛑 Brake: <span className="text-red-400">{controls.brake}</span></p>
//         <p>➡️ Right Indicator: <span className="text-blue-400">{controls.rightIndicator}</span></p>
//         <p>⬅️ Left Indicator: <span className="text-blue-400">{controls.leftIndicator}</span></p>
//       </div>
//     </div>
//   );
// }
