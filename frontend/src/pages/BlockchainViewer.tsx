import { motion } from "framer-motion";
import { useEVCharging } from "@/context/EVChargingContext";
import CyberCard from "@/components/CyberCard";
import { ArrowLeft, Link2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function BlockchainViewer() {
  const { blockchain, chainValid } = useEVCharging();

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 font-mono text-sm">
          <ArrowLeft size={16} /> BACK TO DASHBOARD
        </Link>

        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-mono font-bold text-foreground mb-2">
          <Link2 className="inline mr-2 text-blockchain-teal" size={28} /> Blockchain Ledger
        </motion.h1>
        <p className="text-muted-foreground font-mono text-sm mb-8">
          Ledger integrity: <span className={chainValid ? "text-primary" : "text-destructive"}>{chainValid ? "VALID" : "INVALID"}</span>
        </p>

        <div className="space-y-4">
          {blockchain.map((block, index) => (
            <motion.div key={`${block.index}-${block.transactionId}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <div className="flex items-center gap-4">
                {index > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-blockchain-teal/50" />
                    <Link2 size={14} className="text-blockchain-teal" />
                    <div className="w-0.5 h-8 bg-blockchain-teal/50" />
                  </div>
                )}
                <div className="flex-1">
                  <CyberCard title={`Block #${block.index}`} icon={<Link2 size={16} />} glowColor="teal">
                    <div className="grid md:grid-cols-2 gap-4 font-mono text-xs">
                      <div className="space-y-1">
                        <div><span className="text-muted-foreground">TX ID: </span><span className="text-foreground break-all">{block.transactionId}</span></div>
                        <div><span className="text-muted-foreground">Hash: </span><span className="text-primary break-all">{block.hash}</span></div>
                        <div><span className="text-muted-foreground">Prev Hash: </span><span className="text-cyber break-all">{block.previousHash}</span></div>
                      </div>
                      <div className="space-y-1">
                        <div><span className="text-muted-foreground">VMID: </span><span className="text-foreground">{block.uid || "-"}</span></div>
                        <div><span className="text-muted-foreground">FID: </span><span className="text-foreground">{block.fid || "-"}</span></div>
                        <div><span className="text-muted-foreground">Amount: </span><span className="text-primary">INR {block.amount}</span></div>
                        <div><span className="text-muted-foreground">Time: </span><span className="text-foreground">{new Date(block.timestamp).toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Status: </span><span className={block.status === "SUCCESS" ? "text-primary" : "text-cyber"}>{block.status}</span></div>
                        <div><span className="text-muted-foreground">Dispute: </span><span className={block.disputeFlag ? "text-destructive" : "text-primary"}>{block.disputeFlag ? "YES" : "NO"}</span></div>
                        {block.reason && <div><span className="text-muted-foreground">Reason: </span><span className="text-foreground">{block.reason}</span></div>}
                      </div>
                    </div>
                  </CyberCard>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {blockchain.length <= 1 && (
          <p className="text-muted-foreground text-center mt-8 font-mono">Only the genesis block exists. Complete a transaction to add blocks.</p>
        )}
      </div>
    </div>
  );
}
