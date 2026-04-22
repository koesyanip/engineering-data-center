# ⚡ Engineering Data Center Monitoring System

## 📌 Overview

This project is an **Engineering Data Center Monitoring System** designed to monitor and analyze the performance of power generation equipment, specifically **generators and hydro turbines**.

The system integrates multiple critical parameters, including:

* Electrical harmonics
* Mechanical vibrations
* Thermal and fluid performance

**Main objectives:**

* Improve unit reliability
* Enable early fault detection
* Support data-driven maintenance strategies

---

## 🧩 Main Modules

### 1. ⚡ Generator Electrical Harmonic Monitoring

Monitors power quality of the generator with a focus on harmonic distortion.

**Key Parameters:**

* Total Harmonic Distortion (THD) – Voltage (%)
* Total Harmonic Distortion (THD) – Current (%)
* Individual harmonic components (up to Nth order)
* Load vs harmonic correlation

**Features:**

* Real-time data acquisition (Modbus TCP/RTU)
* Time-series visualization
* Threshold-based alarms (IEEE standards)
* Trend analysis of harmonics vs load

**Use Cases:**

* Detection of non-linear loads
* Identification of potential winding overheating
* Evaluation of generator output quality

---

### 2. 🔧 Generator Vibration Monitoring

Monitors mechanical condition of the generator using vibration analysis.

**Key Parameters:**

* RMS vibration (displacement / velocity)
* FFT spectrum
* Peak frequency detection
* Orbit / waveform (optional)

**Features:**

* High-frequency sampling (FFT-capable)
* Signal filtering (LPF based on system requirements)
* Fault detection:

  * Unbalance
  * Misalignment
  * Looseness (including stator wedges)
* Alarm system integration

**Use Cases:**

* Condition-based maintenance
* Early fault detection
* Structural analysis (natural frequency, resonance behavior)

---

### 3. 💧 Hydro Turbine Performance Monitoring

Monitors hydro turbine performance based on thermal and fluid parameters.

**Key Parameters:**

* Flow rate (Q)
* Inlet/outlet temperature
* Heat transfer (Q = m·Cp·ΔT)
* Cooling system efficiency (Heat Exchanger)

**Features:**

* Real-time heat transfer calculation
* Heat exchanger performance analysis (UA, LMTD)
* Evaluation of flow rate impact on cooling capacity
* Stator temperature distribution monitoring

**Use Cases:**

* Generator cooling system optimization
* Identification of heat exchanger bottlenecks
* Performance evaluation after system modifications (e.g., downstream HE addition)

---

## 🏗️ System Architecture

```
Sensors → Data Acquisition (ESP32 / Modbus) → Backend (Node.js)
        → WebSocket → Frontend Dashboard
```

**Components:**

* Vibration & temperature sensors
* Power meter (harmonic analyzer)
* ESP32 (data acquisition & conversion)
* Modbus TCP/RTU communication
* Backend server (Node.js)
* Web-based dashboard (real-time visualization)

---

## 📡 Data Handling

* Protocol: Modbus TCP over RTU
* Streaming: WebSocket
* Sampling strategy:

  * Vibration: high-speed (FFT analysis)
  * Electrical: interval-based
  * Thermal: slow dynamics

---

## 📊 Analysis Approach

* **Signal Processing**

  * Low-pass filtering
  * FFT analysis

* **Thermal Analysis**

  * Heat transfer modeling
  * Heat exchanger calculations

* **Electrical Analysis**

  * Harmonic spectrum analysis
  * THD calculation

---

## 🚀 Key Features

* Real-time monitoring
* Modular and scalable architecture
* Multi-domain analysis (electrical, mechanical, thermal)
* Data-driven engineering insights
* Customizable dashboard

---

## ⚙️ Technologies Used

* Node.js (backend)
* WebSocket (real-time communication)
* ESP32 (edge computing)
* Modbus TCP/RTU
* JavaScript-based dashboard

---

## 📈 Future Development

* Machine learning for anomaly detection
* Predictive maintenance system
* Integration with SCADA / historian systems
* Advanced vibration diagnostics (AI-based classification)

---

## 👨‍🔧 Author

Developed by:
**Kusuma Yani Pramanto**

---
