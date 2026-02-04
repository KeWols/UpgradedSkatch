import React, { useEffect, useRef, useState } from "react";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const VoiceChat = ({ socket, roomId, playerName, playerCount }) => {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRef = useRef(null);
  const startedRef = useRef(false);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket || !socket.connected || !roomId || !playerName) {
      return;
    }
    // webrtc csak ket jatekosra mukodik
    if (playerCount !== 2) {
      return;
    }

    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    let closed = false;

    const stop = () => {
      const pc = pcRef.current;
      pcRef.current = null;

      if (pc) {
        try { pc.onicecandidate = null; pc.ontrack = null; pc.close(); } catch {}
      }

      const ls = localStreamRef.current;
      localStreamRef.current = null;
      if (ls) {
        try { ls.getTracks().forEach((t) => t.stop()); } catch {}
      }

      setConnected(false);
      startedRef.current = false;
    };

    const onIceCandidate = async (data) => {
      const pc = pcRef.current;
      if (!pc || !data?.candidate) {
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    };

    const onOffer = async (data) => {
      const pc = pcRef.current;
      if (!pc || !data?.offer) {
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
    };

    const onAnswer = async (data) => {
      const pc = pcRef.current;
      if (!pc || !data?.answer) {
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    };

    //inditja az offert a masik answearrel
    const onWebrtcReady = async ({ initiatorId }) => {
      const pc = pcRef.current;

      if (!pc) {
        return;
      }

      if (socket.id !== initiatorId) {
        return;
      }

      if (pc.signalingState !== "stable") {
        return;
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
    };

    const start = async () => {
      //mikrofon engedely
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (closed){
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      //mikrofon hang hozzaadasa a kapcsolathoz
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice_candidate", { roomId, candidate: event.candidate });
        }
      };

      //Hang fogadasa a kapcsolaton
      pc.ontrack = (event) => {

        console.log("ontrack", event.streams[0]?.getAudioTracks()?.[0]);

        //Ha van audio track, akkor lejatszas
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          audioRef.current.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {

        if (pc.connectionState === "connected"){
          setConnected(true);
        }

        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          setConnected(false);
        }
      };

      socket.on("ice_candidate", onIceCandidate);
      socket.on("offer", onOffer);
      socket.on("answer", onAnswer);
      socket.on("webrtc_ready", onWebrtcReady);

      // voice signalok csak relay a szerveren at
      socket.emit("join_voice_chat", { roomId, playerName });
    };

    start().catch(() => stop());

    return () => {
      closed = true;

      socket.off("ice_candidate", onIceCandidate);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("webrtc_ready", onWebrtcReady);

      stop();
    };
  }, [socket, roomId, playerName, playerCount]);

  return (
    <div style={{ marginTop: 20, border: "1px solid white", padding: 10 }}>
      <h3>Voice Chat</h3>
      <p>{connected ? "Connected" : "Not connected"}</p>
      <audio ref={audioRef} autoPlay playsInline controls />
    </div>
  );
};

export default VoiceChat;
