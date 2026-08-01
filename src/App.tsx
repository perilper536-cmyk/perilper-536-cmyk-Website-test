import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Check,
  RefreshCw,
  Lock,
  Trash2,
  HelpCircle,
  Play,
  RotateCcw
} from 'lucide-react';

type Stage = 'initial' | 'voice' | 'plinko' | 'success';

interface Peg {
  x: number;
  y: number;
}

export default function App() {
  const [stage, setStage] = useState<Stage>('initial');
  const [isListening, setIsListening] = useState(false);
  const [wordChunks, setWordChunks] = useState<string[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  const targetPhrase = "is it a robot or a car";
  const requiredTokens = ["is", "it", "a", "robot", "or", "a", "car"];

  const recognitionRef = useRef<any>(null);

  // Plinko state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [plinkoState, setPlinkoState] = useState<'idle' | 'dropping' | 'result'>('idle');
  const [plinkoResultSlot, setPlinkoResultSlot] = useState<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        const cleaned = currentTranscript.trim().toLowerCase();
        const words = cleaned.split(/\s+/).filter(Boolean);
        setWordChunks(words);

        if (words.length > 0) {
          const normalizedJoined = words.join(' ');
          if (
            normalizedJoined.includes('robot') &&
            normalizedJoined.includes('car') &&
            (normalizedJoined.includes('is it') || normalizedJoined.includes('is'))
          ) {
            handleCompleteVerification();
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError('Microphone blocked. Use "No Mic?" option.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startMicrophone = () => {
    if (stage !== 'voice') return;
    setMicError(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    } else {
      setIsListening(true);
    }
  };

  const stopMicrophone = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const handleStartVoice = () => {
    setStage('voice');
    setWordChunks([]);
    setTimeout(() => {
      startMicrophone();
    }, 300);
  };

  const handleCompleteVerification = () => {
    stopMicrophone();
    setTimeout(() => {
      setStage('success');
    }, 600);
  };

  const handleReset = () => {
    stopMicrophone();
    setStage('initial');
    setWordChunks([]);
    setPlinkoState('idle');
    setPlinkoResultSlot(null);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  // --- PLINKO GAME LOGIC ---
  const startPlinkoGame = () => {
    stopMicrophone();
    setStage('plinko');
    setPlinkoState('idle');
    setPlinkoResultSlot(null);
  };

  useEffect(() => {
    if (stage !== 'plinko') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 320;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    // Generate Pegs
    const pegs: Peg[] = [];
    const rows = 5;
    const startY = 50;
    const rowSpacing = 35;

    for (let r = 0; r < rows; r++) {
      const pegCount = 3 + r;
      const spacing = 40;
      const startX = width / 2 - ((pegCount - 1) * spacing) / 2;
      for (let c = 0; c < pegCount; c++) {
        pegs.push({
          x: startX + c * spacing,
          y: startY + r * rowSpacing
        });
      }
    }

    const slots = [
      { label: 'MISS', pass: false, x: 20, w: 52 },
      { label: 'MISS', pass: false, x: 76, w: 52 },
      { label: 'CENTER', pass: true, x: 132, w: 56 },
      { label: 'MISS', pass: false, x: 192, w: 52 },
      { label: 'MISS', pass: false, x: 248, w: 52 },
    ];

    let ball = {
      x: width / 2 + (Math.random() * 8 - 4),
      y: 18,
      vx: 0,
      vy: 0,
      radius: 7,
      active: false
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw slots
      const slotY = height - 35;
      slots.forEach((s) => {
        ctx.fillStyle = s.pass ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = s.pass ? '#34c759' : '#49454f';
        ctx.lineWidth = s.pass ? 2 : 1;

        ctx.beginPath();
        ctx.roundRect(s.x, slotY, s.w, 30, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = s.pass ? '#34c759' : '#8a8886';
        ctx.font = s.pass ? 'bold 10px sans-serif' : '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, s.x + s.w / 2, slotY + 18);
      });

      // Draw pegs
      pegs.forEach((peg) => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#d0bcff';
        ctx.fill();
      });

      // Draw ball
      if (ball.active) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#e23670';
        ctx.shadowColor = '#e23670';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    draw();

    // Trigger animation when dropping
    if (plinkoState === 'dropping') {
      ball.active = true;
      ball.x = width / 2 + (Math.random() * 12 - 6);
      ball.y = 18;
      ball.vx = (Math.random() - 0.5) * 1.5;
      ball.vy = 1;

      const gravity = 0.15;
      const bounce = 0.55;

      const update = () => {
        ball.vy += gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Peg collision
        pegs.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = ball.radius + 4;

          if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            const targetX = peg.x + Math.cos(angle) * minDist;
            const targetY = peg.y + Math.sin(angle) * minDist;

            ball.x = targetX;
            ball.y = targetY;

            // Deflect velocity
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * bounce;
            ball.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.8;
            ball.vy = Math.sin(angle) * speed;
          }
        });

        // Walls
        if (ball.x - ball.radius < 10) {
          ball.x = 10 + ball.radius;
          ball.vx *= -0.5;
        }
        if (ball.x + ball.radius > width - 10) {
          ball.x = width - 10 - ball.radius;
          ball.vx *= -0.5;
        }

        draw();

        // Check landing in slot
        if (ball.y >= height - 35) {
          ball.active = false;

          // Determine slot index
          let hitSlotIndex = 0;
          slots.forEach((s, idx) => {
            if (ball.x >= s.x && ball.x <= s.x + s.w) {
              hitSlotIndex = idx;
            }
          });

          setPlinkoResultSlot(hitSlotIndex);
          setPlinkoState('result');

          if (hitSlotIndex === 2) {
            // Hit middle center slot!
            setTimeout(() => {
              setStage('success');
            }, 800);
          }
          return;
        }

        animFrameRef.current = requestAnimationFrame(update);
      };

      animFrameRef.current = requestAnimationFrame(update);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stage, plinkoState]);

  const dropPlinkoBall = () => {
    setPlinkoState('dropping');
    setPlinkoResultSlot(null);
  };

  return (
    <div className="min-h-screen bg-[#121318] text-[#E3E2E6] flex flex-col items-center justify-between p-4 sm:p-8 font-sans antialiased selection:bg-[#D0BCFF] selection:text-[#381E72]">
      {/* Top Header */}
      <div className="w-full max-w-lg pt-6 text-center space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#E3E2E6]">
          Website Verification
        </h1>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-[420px] my-auto flex flex-col items-center justify-center">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="w-full bg-[#1D1B20] border border-[#49454F] rounded-[28px] p-6 shadow-2xl relative overflow-hidden"
        >
          {/* STAGE 1: Initial Checkbox */}
          {stage === 'initial' && (
            <motion.div
              key="stage-initial"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <p className="text-xs text-[#CAC4D0] font-medium text-center">
                Click box below to complete website verification
              </p>

              <motion.button
                onClick={handleStartVoice}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#2B2930] hover:bg-[#36343B] border-2 border-[#D0BCFF]/60 hover:border-[#D0BCFF] rounded-[20px] p-5 flex items-center justify-between cursor-pointer transition-colors group shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#1D1B20] border-2 border-[#CAC4D0] group-hover:border-[#D0BCFF] flex items-center justify-center transition-colors">
                    <Check className="w-5 h-5 text-transparent group-hover:text-[#D0BCFF]/30" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-bold text-[#E3E2E6] group-hover:text-[#D0BCFF] transition-colors">
                      I'm not a robot
                    </p>
                    <p className="text-xs text-[#CAC4D0]">Click box to verify</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[#D0BCFF] bg-[#381E72]/50 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* STAGE 2: Voice Verification */}
          {stage === 'voice' && (
            <motion.div
              key="stage-voice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 text-center"
            >
              {/* Spoken Prompt Mandate */}
              <div className="space-y-2 py-1">
                <p className="text-xs text-[#CAC4D0] font-semibold uppercase tracking-wider">
                  Please say:
                </p>
                <div className="bg-[#2B2930] border-2 border-[#D0BCFF] rounded-2xl p-4 shadow-inner">
                  <h2 className="text-xl sm:text-2xl font-black text-[#D0BCFF] tracking-tight">
                    "is it a robot or a car?"
                  </h2>
                </div>
                <p className="text-xs text-[#E8DEF8] font-medium bg-[#381E72]/50 border border-[#D0BCFF]/30 py-1.5 px-3 rounded-full inline-block mt-1">
                  (The Files are deleted after verifying.)
                </p>
              </div>

              {/* Mic Icon & Live Transcribed Word Tokens */}
              <div className="bg-[#2B2930] border border-[#49454F] rounded-2xl p-5 flex flex-col items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={isListening ? stopMicrophone : startMicrophone}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                    isListening
                      ? 'bg-[#E23670] text-white animate-pulse ring-4 ring-[#E23670]/40'
                      : 'bg-[#6750A4] hover:bg-[#7D5260] text-white'
                  }`}
                >
                  {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                </button>

                {/* Transcribed Word Tokens (Directly under mic) */}
                <div className="w-full">
                  <div className="flex flex-wrap gap-1.5 justify-center min-h-[38px] p-2 bg-[#121318] rounded-xl border border-[#49454F] items-center">
                    {wordChunks.length === 0 ? (
                      <span className="text-[#A8C7FA]/60 text-xs italic">
                        {isListening ? 'Listening for speech...' : 'Click mic to record'}
                      </span>
                    ) : (
                      wordChunks.map((chunk, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-[#381E72] text-[#D0BCFF] border border-[#D0BCFF]/40 rounded-md text-xs font-mono font-bold animate-fade-in shadow-sm"
                        >
                          {chunk}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {micError && (
                  <p className="text-[11px] text-[#F2B8B5] text-center bg-[#601410]/50 p-2 rounded-lg border border-[#8C1D18]">
                    {micError}
                  </p>
                )}
              </div>

              {/* "No Mic?" Link to Plinko */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={startPlinkoGame}
                  className="text-xs text-[#D0BCFF] hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>No Mic?</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STAGE 3: Plinko Game */}
          {stage === 'plinko' && (
            <motion.div
              key="stage-plinko"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 text-center"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#E3E2E6]">Plinko Verification</h3>
                <p className="text-xs text-[#CAC4D0]">
                  Drop the ball and land in the <span className="text-[#34C759] font-bold">CENTER</span> slot to verify.
                </p>
              </div>

              {/* Plinko Board Canvas */}
              <div className="w-full bg-[#121318] border border-[#49454F] rounded-2xl p-2 flex justify-center shadow-inner relative">
                <canvas ref={canvasRef} className="rounded-lg max-w-full" />
              </div>

              {/* Result Notice */}
              {plinkoResultSlot !== null && (
                <div className="text-xs font-semibold">
                  {plinkoResultSlot === 2 ? (
                    <p className="text-[#34C759] bg-[#34C759]/10 p-2 rounded-lg border border-[#34C759]/30">
                      Landed in CENTER slot! Verification complete.
                    </p>
                  ) : (
                    <p className="text-[#F2B8B5] bg-[#601410]/50 p-2 rounded-lg border border-[#8C1D18]">
                      Missed center slot. Drop again!
                    </p>
                  )}
                </div>
              )}

              {/* Plinko Controls */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={dropPlinkoBall}
                  disabled={plinkoState === 'dropping'}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    plinkoState === 'dropping'
                      ? 'bg-[#49454F] text-[#CAC4D0] cursor-not-allowed'
                      : 'bg-[#6750A4] hover:bg-[#7D5260] text-white active:scale-95'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{plinkoState === 'dropping' ? 'Dropping...' : 'Drop Ball'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartVoice}
                  className="px-3 py-2.5 bg-[#2B2930] hover:bg-[#36343B] border border-[#49454F] text-[#CAC4D0] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Use Mic
                </button>
              </div>
            </motion.div>
          )}

          {/* STAGE 4: Verified Success */}
          {stage === 'success' && (
            <motion.div
              key="stage-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5 py-2"
            >
              <div className="w-16 h-16 bg-[#381E72] border-2 border-[#D0BCFF] text-[#D0BCFF] rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[#E3E2E6]">Verification Complete</h2>
                <p className="text-xs text-[#CAC4D0]">Session verified successfully.</p>
              </div>

              {/* Audio Files Deleted Banner */}
              <div className="p-3.5 bg-[#2B2930] border border-[#49454F] rounded-xl text-left flex items-start gap-3">
                <div className="p-2 bg-[#601410]/60 border border-[#8C1D18] text-[#F2B8B5] rounded-lg shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#E3E2E6]">Privacy Guaranteed</p>
                  <p className="text-[11px] text-[#C7C5D0] mt-0.5">
                    (The Files are deleted after verifying.)
                    <br />
                    <span className="text-[#34C759] font-mono font-semibold">
                      Audio files permanently destroyed.
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 bg-[#2B2930] hover:bg-[#36343B] border border-[#49454F] text-[#E3E2E6] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Verify Again</span>
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Clean Footer */}
      <footer className="w-full max-w-lg py-4 text-center text-xs text-[#CAC4D0]">
        <p>Website Verification</p>
      </footer>
    </div>
  );
}
