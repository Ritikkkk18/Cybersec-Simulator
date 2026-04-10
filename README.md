# Network Security Simulator (CyberSec)

An interactive, web-based network security dashboard designed for teaching cybersecurity concepts through real-time traffic visualization and attack simulations.

## 🚀 Live Demo
**[Click here to view the live simulator](https://ritikkkk18.github.io/Cybersec-Simulator/)**

## 🛡️ Features
- **Visual Network Topology**: Interactive diagram showing Hacker, Router, Firewall, and Server nodes.
- **Attack Simulator**: Launch Port Scans, SSH Brute Force, and ICMP Ping Floods.
- **High-Fidelity Animations**: Real-time packet flow visualization, radar sweeps, and node state feedback.
- **Security Rule Engine**: Create, manage, and replace security rules (Rate Limiting, Port Blocking) to defend your network.
- **Alert Log & Learning Mode**: Detailed logs of every packet with educational explanations for every detected threat.
- **Data Persistence**: Uses `localStorage` to save your custom security rules directly in the browser.

## 🛠️ Technology Stack
- **Frontend**: HTML5, Vanilla CSS3 (Custom keyframe animations), JavaScript (ES6+).
- **Architecture**: 100% Static Single-Page Application (SPA) — no backend required!
- **Icons**: Custom SVG icons for high resolution.

## 📖 How to Use
1. **Launch an Attack**: Click any attack button in the bottom right panel.
2. **Watch the Flow**: Observe the red packet particles and target node reactions.
3. **Analyze**: Check the central table for detailed alerts.
4. **Defend**: Use the "Add Security Rule" form to create a policy to block the specific attack.
5. **Verify**: Click "Test Now" on your new rule to see it successfully block the malicious traffic!

---
Built as part of a **Cyber Security PBL Project**.
