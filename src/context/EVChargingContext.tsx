import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

export interface Franchise {
  fid: string;
  name: string;
  zoneCode: string;
  provider: string;
  balance: number;
  createdAt: string;
  active: boolean;
}

export interface User {
  uid: string;
  name: string;
  zoneCode: string;
  provider: string;
  balance: number;
  mobile: string;
  vmid: string;
  createdAt: string;
  active: boolean;
}

export interface Block {
  index: number;
  transactionId: string;
  uid: string;
  fid: string;
  amount: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  disputeFlag: boolean;
  status: string;
  reason: string;
  userName: string;
  franchiseName: string;
}

export interface Transaction {
  id: string;
  uid: string;
  fid: string;
  amount: number;
  status: "pending" | "success" | "failed" | "refund";
  timestamp: string;
  userName: string;
  franchiseName: string;
  message?: string;
  hardwareSuccess?: boolean;
  userBalance?: number;
  franchiseBalance?: number;
}

export interface QuantumAttackResult {
  public_key: [number, number];
  private_key: [number, number];
  cracked_private_key: [number, number];
  recovered_private_key: [number, number];
  recovered_p: number;
  recovered_q: number;
  period_r: number;
  original_vmid: string;
  original_pin: string;
  vmid_small: number;
  pin_small: number;
  enc_vmid_small: number;
  enc_pin_small: number;
  enc_vmid: number[];
  enc_pin: number[];
  stolen_vmid_small: number;
  stolen_pin_small: number;
  stolen_vmid: string;
  stolen_pin: string;
  matches_original_private_key: boolean;
}

export interface AuditEntry {
  time: string;
  event: string;
}

interface StationPayload {
  vfid: string;
  encrypted: string;
  franchiseName?: string;
}

interface EVChargingState {
  franchises: Franchise[];
  users: User[];
  blockchain: Block[];
  transactions: Transaction[];
  providers: string[];
  zones: Record<string, string[]>;
  auditLog: AuditEntry[];
  chainValid: boolean;
  asconAvailable: boolean;
  dbPath: string;
  loading: boolean;
  error: string | null;
  registerFranchise: (
    name: string,
    zoneCode: string,
    provider: string,
    password: string,
    balance: number
  ) => Promise<Franchise>;
  registerUser: (
    name: string,
    zoneCode: string,
    provider: string,
    password: string,
    pin: string,
    mobile: string,
    balance: number
  ) => Promise<User>;
  generateVFID: (fid: string) => Promise<StationPayload>;
  processTransaction: (vmid: string, pin: string, amount: number, encryptedFid: string) => Promise<Transaction>;
  simulateShorAttack: (vmid?: string) => Promise<QuantumAttackResult>;
  refreshState: () => Promise<void>;
  resetDemoData: () => Promise<void>;
}

interface ApiState {
  providers: Record<string, string[]>;
  users: ApiUser[];
  franchises: ApiFranchise[];
  blockchain: ApiBlock[];
  audit_log: AuditEntry[];
  summary: {
    chain_valid: boolean;
    ascon_available: boolean;
    db_path: string;
  };
}

interface ApiUser {
  uid: string;
  name: string;
  mobile: string;
  vmid: string;
  balance: number;
  zone_code: string;
  provider: string;
  created_at: number;
  active: boolean;
}

interface ApiFranchise {
  fid: string;
  name: string;
  balance: number;
  zone_code: string;
  provider: string;
  created_at: number;
  active: boolean;
}

interface ApiBlock {
  index: number;
  transaction_id: string;
  previous_hash: string;
  timestamp: number;
  status: string;
  dispute: boolean;
  reason: string;
  block_hash: string;
  vmid: string;
  fid: string;
  user_name: string;
  franchise_name: string;
  amount: number;
}

const EVChargingContext = createContext<EVChargingState | null>(null);

function toIsoString(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function mapUser(user: ApiUser): User {
  return {
    uid: user.uid,
    name: user.name,
    zoneCode: user.zone_code,
    provider: user.provider,
    balance: user.balance,
    mobile: user.mobile,
    vmid: user.vmid,
    createdAt: toIsoString(user.created_at),
    active: user.active,
  };
}

function mapFranchise(franchise: ApiFranchise): Franchise {
  return {
    fid: franchise.fid,
    name: franchise.name,
    zoneCode: franchise.zone_code,
    provider: franchise.provider,
    balance: franchise.balance,
    createdAt: toIsoString(franchise.created_at),
    active: franchise.active,
  };
}

function mapBlock(block: ApiBlock): Block {
  return {
    index: block.index,
    transactionId: block.transaction_id,
    uid: block.vmid,
    fid: block.fid,
    amount: Number(block.amount ?? 0),
    timestamp: toIsoString(block.timestamp),
    previousHash: block.previous_hash,
    hash: block.block_hash,
    disputeFlag: block.dispute,
    status: block.status,
    reason: block.reason,
    userName: block.user_name,
    franchiseName: block.franchise_name,
  };
}

function mapBlockToTransaction(block: Block): Transaction {
  const normalizedStatus = block.status.toLowerCase();
  const status: Transaction["status"] =
    normalizedStatus === "success" ? "success" : normalizedStatus === "refund" ? "refund" : "failed";
  return {
    id: block.transactionId,
    uid: block.uid,
    fid: block.fid,
    amount: block.amount,
    status,
    timestamp: block.timestamp,
    userName: block.userName || "Unknown",
    franchiseName: block.franchiseName || "Unknown",
    message: block.reason || block.status,
  };
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export function EVChargingProvider({ children }: { children: React.ReactNode }) {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [blockchain, setBlockchain] = useState<Block[]>([]);
  const [providersMap, setProvidersMap] = useState<Record<string, string[]>>({});
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [chainValid, setChainValid] = useState(false);
  const [asconAvailable, setAsconAvailable] = useState(false);
  const [dbPath, setDbPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyState = useCallback((state: ApiState) => {
    setProvidersMap(state.providers);
    setUsers(state.users.map(mapUser));
    setFranchises(state.franchises.map(mapFranchise));
    setBlockchain(state.blockchain.map(mapBlock));
    setAuditLog(state.audit_log ?? []);
    setChainValid(state.summary.chain_valid);
    setAsconAvailable(state.summary.ascon_available);
    setDbPath(state.summary.db_path);
  }, []);

  const refreshState = useCallback(async () => {
    setError(null);
    const state = await apiRequest<ApiState>("/state");
    applyState(state);
  }, [applyState]);

  useEffect(() => {
    let active = true;

    async function loadInitialState() {
      setLoading(true);
      try {
        const state = await apiRequest<ApiState>("/state");
        if (active) {
          applyState(state);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to reach backend API.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialState();
    return () => {
      active = false;
    };
  }, [applyState]);

  const registerFranchise = useCallback(
    async (name: string, zoneCode: string, provider: string, password: string, balance: number) => {
      setError(null);
      const data = await apiRequest<{ franchise: ApiFranchise; state: ApiState }>("/franchises", {
        method: "POST",
        body: JSON.stringify({
          name,
          zone_code: zoneCode,
          provider,
          password,
          balance,
        }),
      });
      applyState(data.state);
      return mapFranchise(data.franchise);
    },
    [applyState]
  );

  const registerUser = useCallback(
    async (name: string, zoneCode: string, provider: string, password: string, pin: string, mobile: string, balance: number) => {
      setError(null);
      const data = await apiRequest<{ user: ApiUser; state: ApiState }>("/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          zone_code: zoneCode,
          provider,
          password,
          pin,
          mobile,
          balance,
        }),
      });
      applyState(data.state);
      return mapUser(data.user);
    },
    [applyState]
  );

  const generateVFID = useCallback(async (fid: string) => {
    setError(null);
    const data = await apiRequest<{ payload: string; fid: string; franchise_name: string }>("/station-qr", {
      method: "POST",
      body: JSON.stringify({ fid }),
    });
    return {
      vfid: data.fid,
      encrypted: data.payload,
      franchiseName: data.franchise_name,
    };
  }, []);

  const processTransaction = useCallback(
    async (vmid: string, pin: string, amount: number, encryptedFid: string) => {
      setError(null);
      const data = await apiRequest<{
        result: {
          ok: boolean;
          message: string;
          fid?: string;
          user_balance?: number;
          franchise_balance?: number;
          hardware_success?: boolean;
        };
        blocks_added: ApiBlock[];
        state: ApiState;
      }>("/payments", {
        method: "POST",
        body: JSON.stringify({
          encrypted_payload: encryptedFid,
          vmid,
          pin,
          amount,
        }),
      });

      applyState(data.state);

      const latestBlock = data.blocks_added[data.blocks_added.length - 1];
      const mappedBlock = latestBlock ? mapBlock(latestBlock) : null;
      return {
        id: mappedBlock?.transactionId || "AUTH-FAILED",
        uid: vmid,
        fid: data.result.fid || mappedBlock?.fid || "UNKNOWN",
        amount,
        status: data.result.ok ? "success" : data.result.hardware_success === false ? "refund" : "failed",
        timestamp: mappedBlock?.timestamp || new Date().toISOString(),
        userName: users.find((user) => user.vmid === vmid)?.name || mappedBlock?.userName || "Unknown",
        franchiseName:
          franchises.find((franchise) => franchise.fid === (data.result.fid || mappedBlock?.fid || ""))?.name ||
          mappedBlock?.franchiseName ||
          "Unknown",
        message: data.result.message,
        hardwareSuccess: data.result.hardware_success,
        userBalance: data.result.user_balance,
        franchiseBalance: data.result.franchise_balance,
      };
    },
    [applyState, franchises, users]
  );

  const simulateShorAttack = useCallback(async (vmid?: string) => {
    setError(null);
    const data = await apiRequest<{ demo: QuantumAttackResult }>("/quantum-demo", {
      method: "POST",
      body: JSON.stringify(vmid ? { vmid } : {}),
    });
    return data.demo;
  }, []);

  const resetDemoData = useCallback(async () => {
    setError(null);
    const data = await apiRequest<{ state: ApiState }>("/reset", {
      method: "POST",
      body: JSON.stringify({}),
    });
    applyState(data.state);
  }, [applyState]);

  const transactions = useMemo(
    () => blockchain.filter((block) => block.index > 0).map(mapBlockToTransaction).reverse(),
    [blockchain]
  );

  const value = useMemo(
    () => ({
      franchises,
      users,
      blockchain,
      transactions,
      providers: Object.keys(providersMap),
      zones: providersMap,
      auditLog,
      chainValid,
      asconAvailable,
      dbPath,
      loading,
      error,
      registerFranchise,
      registerUser,
      generateVFID,
      processTransaction,
      simulateShorAttack,
      refreshState,
      resetDemoData,
    }),
    [
      auditLog,
      asconAvailable,
      blockchain,
      chainValid,
      dbPath,
      error,
      franchises,
      generateVFID,
      loading,
      processTransaction,
      providersMap,
      refreshState,
      registerFranchise,
      registerUser,
      resetDemoData,
      simulateShorAttack,
      transactions,
      users,
    ]
  );

  return <EVChargingContext.Provider value={value}>{children}</EVChargingContext.Provider>;
}

export function useEVCharging() {
  const ctx = useContext(EVChargingContext);
  if (!ctx) throw new Error("useEVCharging must be used within EVChargingProvider");
  return ctx;
}
