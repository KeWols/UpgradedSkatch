import React, { useEffect, useRef, useState } from "react";

const MicTest = () => {
  const [volume, setVolume] = useState(0);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;

    // Mikrofon engedelyezese es stream kezelese
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
        }

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(256, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 512;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        javascriptNode.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          const average = array.reduce((a, b) => a + b, 0) / array.length;
          setVolume(average); 
        };
      })
      .catch((err) => {
        console.error("Mikrofon hiba:", err);
      });

    return () => {
      if (audioContext) {
        audioContext.close();
      }
      if (audioRef.current?.srcObject) {
        audioRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div style={{ padding: "20px", textAlign: "center", border: "1px solid gray" }}>
      <h3>Mikrofon Teszt</h3>
      <audio ref={audioRef} controls autoPlay />
      <p>Ha működik, akkor hallani fogod a saját hangodat.</p>

      {/* Hangerő kijelző */}
      <div style={{ marginTop: "10px" }}>
        <p><strong>Hangerőszint:</strong> {volume.toFixed(2)}</p>
        <div style={{ width: "100%", height: "10px", background: "#ddd", borderRadius: "5px" }}>
          <div
            style={{
              width: `${Math.min(volume, 100)}%`,
              height: "100%",
              background: volume > 50 ? "red" : "green",
              borderRadius: "5px",
              transition: "width 0.1s",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MicTest;