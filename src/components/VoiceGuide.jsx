import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const welcomeText = "Welcome to MonuVista,explore history beyond what you see.";
let welcomePlayedThisLoad = false;

export default function VoiceGuide() {
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported || muted || played || welcomePlayedThisLoad) return;
    welcomePlayedThisLoad = true;
    const utterance = new SpeechSynthesisUtterance(welcomeText);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    setPlayed(true);
  }, [muted, played, supported]);

  function toggleVoice() {
    if (!supported) return;
    if (!muted && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setMuted((value) => !value);
  }

  return (
    <button className="voice-toggle" type="button" onClick={toggleVoice}>
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      <span>{muted ? "Voice Off" : "Voice On"}</span>
    </button>
  );
}
