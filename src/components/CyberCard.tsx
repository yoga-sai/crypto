import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CyberCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  glowColor?: "green" | "blue" | "purple" | "teal";
  className?: string;
}

const glowClasses = {
  green: "glow-green border-primary/30",
  blue: "glow-blue border-cyber/30",
  purple: "glow-purple border-quantum/30",
  teal: "border-blockchain-teal/30",
};

export default function CyberCard({ title, icon, children, glowColor = "green", className = "" }: CyberCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-lg border bg-card p-6 ${glowClasses[glowColor]} ${className}`}
    >
      <div className="absolute inset-0 rounded-lg scanline pointer-events-none opacity-30" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="text-lg font-mono font-semibold text-foreground">{title}</h3>
        </div>
        {children}
      </div>
    </motion.div>
  );
}
