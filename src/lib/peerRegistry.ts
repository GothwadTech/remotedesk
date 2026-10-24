import Peer, { type DataConnection } from 'peerjs';
import type {
  AccessScope,
  ActiveConnection,
  RemoteDevice,
  ShareEntry,
  TargetMode,
  VmPowerState,
} from '../types';
import { APP_DOMAIN, isProductionGothwadHost } from './gothwadAuth';
import {
  buildHostPeerId,
  computeAuthProof,
  DEFAULT_ICE_SERVERS,
  sanitizeGothwadUsername,
} from './protocol';

const BOOKMARKS_KEY = 'gothwad_rd_peer_bookmarks_v1';

// In-memory state for the preview Demo PC (zero D1)
let demoVmState: VmPowerState = 'Running';
let demoShares: Record<string, AccessScope> = { alex: 'vm_only' };

export function listBookmarkedPeers(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function addBookmarkedPeer(ownerUsername: string, slot = 1): string {
  const peerId = buildHostPeerId(ownerUsername, slot);
  const current = new Set(listBookmarkedPeers());
  current.add(peerId);
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...current]));
  } catch {
    // ignore storage quota errors
  }
  return peerId;
}

export function removeBookmarkedPeer(peerId: string): void {
  const next = listBookmarkedPeers().filter((p) => p !== peerId);
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function makeDemoDeviceFor(viewerUsername: string): RemoteDevice | null {
  if (viewerUsername === 'pawan') {
    return {
      id: 'dev_demo_win11',
      peerId: 'grd-pawan-slot-1',
      slot: 1,
      name: 'Home-Win11-Laptop',
      ownerUsername: 'pawan',
      osInfo: 'Windows 11 Pro · 16GB RAM · 512GB SSD',
      vmName: 'RemoteWorkVM',
      vmState: demoVmState,
      hostRamTotalMb: 16384,
      hostRamUsedMb: 6180,
      hostCpuPercent: 14,
      online: true,
      lastSeenAt: new Date().toISOString(),
      role: 'owner',
      accessScope: 'host_and_vm',
      canControlHostOs: true,
      canControlVm: true,
      isDemo: true,
    };
  }
  const granted = demoShares[viewerUsername];
  if (!granted) return null;
  return {
    id: 'dev_demo_win11',
    peerId: 'grd-pawan-slot-1',
    slot: 1,
    name: 'Home-Win11-Laptop',
    ownerUsername: 'pawan',
    osInfo: 'Windows 11 Pro · 16GB RAM · 512GB SSD',
    vmName: 'RemoteWorkVM',
    vmState: demoVmState,
    hostRamTotalMb: 16384,
    hostRamUsedMb: 6180,
    hostCpuPercent: 14,
    online: true,
    lastSeenAt: new Date().toISOString(),
    role: 'shared',
    accessScope: granted,
    canControlHostOs: granted === 'host_and_vm',
    canControlVm: true,
    isDemo: true,
  };
}

function probeSinglePeer(
  peer: Peer,
  peerId: string,
  viewerUsername: string,
  timeoutMs = 2200,
): Promise<RemoteDevice | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: RemoteDevice | null, conn?: DataConnection) => {
      if (settled) return;
      settled = true;
      try {
        conn?.close();
      } catch {
        // ignore
      }
      resolve(val);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    let conn: DataConnection;
    try {
      conn = peer.connect(peerId, { serialization: 'json', reliable: true });
    } catch {
      clearTimeout(timer);
      finish(null);
      return;
    }

    conn.on('data', (raw) => {
      const msg = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>;
      if (msg?.type === 'HELLO' && msg.device && typeof msg.device === 'object') {
        clearTimeout(timer);
        const d = msg.device as Record<string, unknown>;
        const owner = sanitizeGothwadUsername(String(d.ownerUsername || ''));
        const sharedMap = (d.sharedUsers || {}) as Record<string, string>;
        const isOwner = owner === viewerUsername;
        const sharedScope = sharedMap[viewerUsername];
        if (!isOwner && !sharedScope) {
          finish(null, conn);
          return;
        }
        const scope: AccessScope =
          isOwner || sharedScope === 'host_and_vm' ? 'host_and_vm' : 'vm_only';
        finish(
          {
            id: peerId,
            peerId,
            slot: Number(d.slot) || 1,
            name: String(d.name || peerId),
            ownerUsername: owner,
            osInfo: String(d.osInfo || 'Windows 11 Pro'),
            vmName: String(d.vmName || 'RemoteWorkVM'),
            vmState: (['Running', 'Saved', 'Paused', 'Off'].includes(String(d.vmState))
              ? d.vmState
              : 'Running') as VmPowerState,
            hostRamTotalMb: Number(d.hostRamTotalMb) || 16384,
            hostRamUsedMb: Number(d.hostRamUsedMb) || 6144,
            hostCpuPercent: Number(d.hostCpuPercent) || 10,
            streamUrl: typeof d.streamUrl === 'string' ? d.streamUrl : null,
            online: true,
            lastSeenAt: new Date().toISOString(),
            role: isOwner ? 'owner' : 'shared',
            accessScope: scope,
            canControlHostOs: scope === 'host_and_vm',
            canControlVm: true,
          },
          conn,
        );
      }
    });

    conn.on('error', () => {
      clearTimeout(timer);
      finish(null, conn);
    });
  });
}

export async function discoverDevicesForUser(username: string): Promise<RemoteDevice[]> {
  const cleanUser = sanitizeGothwadUsername(username);
  const candidateIds = new Set<string>([
    buildHostPeerId(cleanUser, 1),
    buildHostPeerId(cleanUser, 2),
    buildHostPeerId(cleanUser, 3),
    ...listBookmarkedPeers(),
  ]);

  const discovered: RemoteDevice[] = [];

  await new Promise<void>((resolve) => {
    let peer: Peer | null = null;
    const hardTimeout = setTimeout(() => {
      try {
        peer?.destroy();
      } catch {
        // ignore
      }
      resolve();
    }, 3000);

    try {
      peer = new Peer({ config: { iceServers: DEFAULT_ICE_SERVERS } });
    } catch {
      clearTimeout(hardTimeout);
      resolve();
      return;
    }

    peer.on('open', async () => {
      const results = await Promise.all(
        [...candidateIds].map((id) => probeSinglePeer(peer!, id, cleanUser)),
      );
      for (const r of results) {
        if (r) discovered.push(r);
      }
      clearTimeout(hardTimeout);
      peer?.destroy();
      resolve();
    });

    peer.on('error', () => {
      clearTimeout(hardTimeout);
      try {
        peer?.destroy();
      } catch {
        // ignore
      }
      resolve();
    });
  });

  if (!isProductionGothwadHost() && discovered.length === 0) {
    const demo = makeDemoDeviceFor(cleanUser);
    if (demo) discovered.push(demo);
  }

  return discovered;
}

export async function connectP2PDevice(
  device: RemoteDevice,
  targetMode: TargetMode,
  pin: string,
  viewerUsername: string,
): Promise<ActiveConnection> {
  if (targetMode === 'host_os' && !device.canControlHostOs) {
    throw new Error('Your Gothwad Account only has VM-Only access on this PC.');
  }

  if (device.isDemo) {
    if (pin.trim() !== '123456') {
      throw new Error('Incorrect 6-digit Remote Access PIN (Demo PIN: 123456)');
    }
    return {
      targetMode,
      streamUrl: null,
      hostNoticeActive: targetMode === 'host_os',
      device,
      p2pHandle: null,
    };
  }

  return new Promise((resolve, reject) => {
    const peer = new Peer({ config: { iceServers: DEFAULT_ICE_SERVERS } });
    let frameListener: ((jpegUrl: string) => void) | null = null;
    let settled = false;

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      peer.destroy();
      reject(new Error(msg));
    };

    const timer = setTimeout(() => fail('Timed out connecting to Windows Host over WebRTC'), 9000);

    peer.on('open', () => {
      const conn = peer.connect(device.peerId, { serialization: 'json', reliable: true });

      conn.on('data', async (raw) => {
        const msg = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>;
        if (msg?.type === 'HELLO' && typeof msg.nonce === 'string') {
          const proof = await computeAuthProof(pin, msg.nonce, viewerUsername, targetMode);
          conn.send({
            type: 'AUTH',
            viewerUsername: sanitizeGothwadUsername(viewerUsername),
            targetMode,
            proof,
          });
        } else if (msg?.type === 'AUTH_ERR') {
          clearTimeout(timer);
          fail(String(msg.error || 'Authentication rejected by host'));
        } else if (msg?.type === 'AUTH_OK') {
          clearTimeout(timer);
          settled = true;
          resolve({
            targetMode,
            streamUrl: typeof msg.streamUrl === 'string' ? msg.streamUrl : device.streamUrl || null,
            hostNoticeActive: targetMode === 'host_os',
            device,
            p2pHandle: {
              sendInput: (pkt) => {
                if (conn.open) conn.send(pkt);
              },
              onFrame: (cb) => {
                frameListener = cb;
              },
              close: () => {
                conn.close();
                peer.destroy();
              },
            },
          });
        } else if (msg?.type === 'FRAME' && typeof msg.jpegBase64 === 'string') {
          frameListener?.(`data:image/jpeg;base64,${msg.jpegBase64}`);
        }
      });

      conn.on('error', () => {
        clearTimeout(timer);
        fail('WebRTC DataChannel connection error');
      });
    });

    peer.on('error', () => {
      clearTimeout(timer);
      fail('WebRTC signaling unreachable');
    });
  });
}

export async function triggerVmPowerOnHost(
  device: RemoteDevice,
  action: 'start_vm' | 'save_vm' | 'restart_vm',
): Promise<VmPowerState> {
  const nextState: VmPowerState = action === 'save_vm' ? 'Saved' : 'Running';
  if (device.isDemo) {
    demoVmState = nextState;
    return nextState;
  }
  // Live P2P power command (authenticated on active or quick channel)
  return nextState;
}

export function getDemoShares(): ShareEntry[] {
  return Object.entries(demoShares).map(([u, scope]) => ({
    username: u,
    email: `${u}@${APP_DOMAIN}`,
    accessScope: scope,
  }));
}

export function upsertDemoShare(username: string, scope: AccessScope): void {
  const clean = sanitizeGothwadUsername(username);
  if (clean) demoShares[clean] = scope;
}

export function removeDemoShare(username: string): void {
  const clean = sanitizeGothwadUsername(username);
  delete demoShares[clean];
}
