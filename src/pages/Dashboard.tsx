import { motion } from "framer-motion";
import { useEVCharging } from "@/context/EVChargingContext";
import { Link } from "react-router-dom";
import { Zap, Shield, Cpu, Link2, Users, Building2, Activity } from "lucide-react";
import CyberCard from "@/components/CyberCard";

const navItems = [
  { to: "/grid", label: "Grid Authority", icon: <Cpu size={28} />, desc: "Manage providers, zones and accounts", glow: "green" as const },
  { to: "/kiosk", label: "Charging Kiosk", icon: <Zap size={28} />, desc: "QR generation and payment processing", glow: "blue" as const },
  { to: "/blockchain", label: "Blockchain Ledger", icon: <Link2 size={28} />, desc: "Immutable transaction records", glow: "teal" as const },
  { to: "/quantum", label: "Quantum Attack", icon: <Shield size={28} />, desc: "Shor-based RSA vulnerability demo", glow: "purple" as const },
];

export default function Dashboard() {
  const { franchises, users, blockchain, transactions, loading, error, chainValid, asconAvailable } = useEVCharging();

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap size={40} className="text-primary text-glow-green" />
            <h1 className="text-4xl md:text-5xl font-mono font-bold text-foreground">
              EV <span className="text-primary text-glow-green">Charge</span>Gate
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Secure Centralized EV Charging Payment Gateway with live backend cryptography, blockchain logging, and a quantum attack demo.
          </p>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            {["ASCON-128", "SHA-3 (Keccak)", "Shor Simulation", "Blockchain"].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full border border-primary/30 text-primary text-xs font-mono">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <div className="text-muted-foreground mb-1">Backend Status</div>
            <div className={error ? "text-destructive" : "text-primary"}>
              {loading ? "Loading backend state..." : error ? error : "Connected to Python EV gateway"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <div className="text-muted-foreground mb-1">Security Status</div>
            <div className="text-foreground">
              Chain valid: <span className="text-primary">{chainValid ? "YES" : "NO"}</span>
            </div>
            <div className="text-foreground">
              ASCON engine: <span className="text-cyber">{asconAvailable ? "AVAILABLE" : "Fallback cipher active"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Franchises", value: franchises.length, icon: <Building2 size={18} /> },
            { label: "Users", value: users.length, icon: <Users size={18} /> },
            { label: "Blocks", value: blockchain.length, icon: <Link2 size={18} /> },
            { label: "Transactions", value: transactions.length, icon: <Activity size={18} /> },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border border-border bg-card p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                {stat.icon}
                <span className="text-xs font-mono">{stat.label}</span>
              </div>
              <div className="text-2xl font-mono font-bold text-primary">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {navItems.map((item, i) => (
            <Link key={item.to} to={item.to}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <CyberCard title={item.label} icon={item.icon} glowColor={item.glow}>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                  <div className="mt-3 text-primary text-xs font-mono">- ENTER MODULE</div>
                </CyberCard>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
