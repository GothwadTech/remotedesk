export type TargetMode = 'host_os' | 'hyperv_vm';
export type AccessScope = 'vm_only' | 'host_and_vm';
export type VmPowerState = 'Running' | 'Saved' | 'Paused' | 'Off';

export interface AccountItem {
  index: number;
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  active: boolean;
}

export interface SessionPayload {
  authenticated: boolean;
  user: {
    username: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
  authuser: number;
  activeId: string | null;
  accounts: AccountItem[];
  accountUrl: string;
  source: 'cookie' | 'bearer' | 'dev';
}

export interface RemoteDevice {
  id: string;
  peerId: string;
  slot: number;
  name: string;
  ownerUsername: string;
  osInfo: string;
  vmName: string;
  vmState: VmPowerState;
  hostRamTotalMb: number;
  hostRamUsedMb: number;
  hostCpuPercent: number;
  streamUrl?: string | null;
  online: boolean;
  lastSeenAt: string;
  role: 'owner' | 'shared';
  accessScope: AccessScope;
  canControlHostOs: boolean;
  canControlVm: boolean;
  isDemo?: boolean;
}

export interface P2PSessionHandle {
  sendInput: (packet: Record<string, unknown>) => void;
  onFrame: (cb: (jpegDataUrl: string) => void) => void;
  close: () => void;
}

export interface ActiveConnection {
  targetMode: TargetMode;
  streamUrl: string | null;
  hostNoticeActive: boolean;
  device: RemoteDevice;
  p2pHandle: P2PSessionHandle | null;
}

export interface ShareEntry {
  username: string;
  email: string;
  accessScope: AccessScope;
}
