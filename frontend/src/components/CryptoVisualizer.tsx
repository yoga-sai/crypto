import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface CryptoVisualizerProps {
  input: string;
  output: string;
  algorithm: string;
  isActive: boolean;
}

export default function CryptoVisualizer({ input, output, algorithm, isActive }: CryptoVisualizerProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const steps: Record<string, string[]> = {
    "SHA-3": ["Padding input...", "Applying Keccak-f permutation...", "XOR state mixing...", "Squeezing output..."],
    ASCON: ["Initializing state...", "Absorbing data block...", "Permutation round (12)...", "Finalizing ciphertext..."],
    "Shor's": ["Initializing qubits...", "Applying Hadamard gates...", "Modular exponentiation...", "Quantum FFT...", "Measuring period..."],
  };

  useEffect(() => {
    if (!isActive) { setProgress(0); return; }
    const algoSteps = steps[algorithm] || steps["SHA-3"];
    let step = 0;
    const interval = setInterval(() => {
      if (step < algoSteps.length) {
        setCurrentStep(algoSteps[step]);
        setProgress(((step + 1) / algoSteps.length) * 100);
        step++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [isActive, algorithm]);

  return (
    <div className="rounded-md border border-border bg-muted/50 p-4 font-mono text-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? "bg-primary animate-pulse-glow" : "bg-muted-foreground"}`} />
        <span className="text-primary font-semibold">{algorithm}</span>
      </div>

      <div className="space-y-2">
        <div className="text-muted-foreground">
          IN: <span className="text-foreground break-all">{input || "—"}</span>
        </div>

        {isActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <div className="text-warning-amber text-xs">{currentStep}</div>
            <div className="w-full bg-border rounded-full h-1.5">
              <motion.div
                className="bg-primary h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        <div className="text-muted-foreground">
          OUT: <span className="text-primary break-all">{progress === 100 ? output : "..."}</span>
        </div>
      </div>
    </div>
  );
}
