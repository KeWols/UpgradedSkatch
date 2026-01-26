import React, { useEffect, useState, useRef } from "react";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const VoiceChat = ({ socket, roomId, playerName, playerCount }) => {
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [connected, setConnected] = useState(false);
  const audioRef = useRef(null);
  const peerRef = useRef(null);

  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  function stopVoiceChat() {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setConnected(false);
    console.log("🔻 VoiceChat kapcsolat lezárva.");
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  useEffect(() => {
    // Alapfeltételek
    if (!socket || !roomId || !playerName) {
      console.error("❌ VoiceChat: nincs socket, roomId vagy playerName.");
      stopVoiceChat();
      return;
    }
    if (playerCount !== 2) {
      console.warn("❌ VoiceChat: A kapcsolódáshoz pontosan 2 játékos szükséges.");
      stopVoiceChat();
      return;
    }

    console.log(`⚡ VoiceChat start: ${roomId} ${playerName}`);

    async function startVoiceChat() {
      try {
        if (peerRef.current && peerRef.current.connectionState !== "closed") {
          console.warn("🔄 Már van egy aktív PeerConnection.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });// mikrofon hasznalat hozzaferes
        setLocalStream(stream);

        const pc = new RTCPeerConnection(ICE_SERVERS); //Létrehoz egy új PeerConnection objektumot, amely a WebRTC kapcsolatot kezel

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        setPeerConnection(pc);
        peerRef.current = pc;

        console.log("✅ WebRTC kapcsolat létrejött!");

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("🟢 ICE candidate küldése:", event.candidate);
            socket.emit("ice_candidate", { roomId, candidate: event.candidate });
          }
        };

        pc.ontrack = (event) => { //másik féltől érkező hang fogadása és lejátszása
          console.log("📡 Távoli hang érkezett:", event.streams);
          if (audioRef.current) {
            audioRef.current.srcObject = event.streams[0];
            audioRef.current.play().catch((err) => {
              console.error("🔇 Hiba a remoteAudio lejátszásakor:", err);
            });

            // Dátum: beépítünk egy Analyser-t a fogadott streamre
            setupRemoteAnalyser(event.streams[0]);
          }
        };

        socket.on("ice_candidate", (data) => {
          if (data.candidate) {
            console.log("🔵 ICE candidate fogadva:", data.candidate);
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        });

        socket.emit("join_voice_chat", { roomId, playerName });

        socket.on("offer", async (data) => {
          console.log("📩 Offer érkezett:", data);
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { roomId, answer });
        });

        socket.on("answer", async (data) => {
          console.log("📩 Answer érkezett:", data);
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        });

        setConnected(true);
      } catch (error) {
        console.error("🚨 getUserMedia hiba", error);
        stopVoiceChat();
      }
    }

    function setupRemoteAnalyser(remoteStream) {

      audioContextRef.current = new AudioContext();
      const audioContext = audioContextRef.current;

      const source = audioContext.createMediaStreamSource(remoteStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      measureVolume();
    }

    function measureVolume() {
      if (!analyserRef.current) return;
      const analyser = analyserRef.current;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      // Például 17-es threshold
      if (average > 17) {
        console.log(`You received a voice wave bigger than 17 dB (avg = ${average.toFixed(2)})`);
      }

      requestAnimationFrame(measureVolume);
    }

    startVoiceChat();

    return () => {
      stopVoiceChat();
    };
  }, [socket, roomId, playerName, playerCount]);

  return (
    <div style={{ marginTop: "20px", border: "1px solid white", padding: "10px" }}>
      <h3>Voice Chat</h3>
      {connected ? <p>🔊 Kapcsolat aktív</p> : <p>❌ Kapcsolat inaktív</p>}
      <audio id="remote-audio" ref={audioRef} autoPlay />
    </div>
  );
};

export default VoiceChat;
