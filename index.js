const net = require("net");
const crc = require("crc");

const HOST = "192.168.1.173";
const PORT = 27001;
const SLAVE_ID = 0x30;

// ================= Build Write Request =================
function buildWrite(register, value) {
  const buf = Buffer.alloc(6);

  buf.writeUInt8(SLAVE_ID, 0);  // Slave ID
  buf.writeUInt8(0x06, 1);      // Function 06 (Write Single Register)
  buf.writeUInt16BE(register, 2);
  buf.writeUInt16BE(value, 4);

  const crcVal = crc.crc16modbus(buf);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16LE(crcVal);

  return Buffer.concat([buf, crcBuf]);
}

// ================= Connect =================
const socket = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log("Connected to RTU via Ethernet");

  // STEP 1 - Unlock
  console.log("Unlocking...");
  socket.write(buildWrite(0x0069, 0xB588));

  setTimeout(() => {
    // STEP 2 - Set baudrate to 115200 (value 0x0006)
    console.log("Setting baudrate to 115200...");
    socket.write(buildWrite(0x0004, 0x0002));
  }, 500);

  setTimeout(() => {
    // STEP 3 - Save config
    console.log("Saving configuration...");
    socket.write(buildWrite(0x0000, 0x0000));
  }, 1000);

  setTimeout(() => {
    console.log("Done. You can close this program.");
  }, 2000);
});

// ================= Response Monitor =================
socket.on("data", (data) => {
  console.log("Response:", data.toString("hex"));
});

socket.on("error", (err) => {
  console.error("Socket error:", err.message);
});

socket.on("close", () => {
  console.log("Connection closed");
});