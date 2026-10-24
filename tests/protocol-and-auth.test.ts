import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  buildHostPeerId,
  computeAuthProof,
  sanitizeGothwadUsername,
  verifyAuthProof,
} from '../src/lib/protocol';
import { isProductionGothwadHost } from '../src/lib/gothwadAuth';

describe('Zero-D1 P2P Protocol & Gothwad Auth Helpers', () => {
  it('generates deterministic P2P slot IDs from Gothwad usernames and emails', () => {
    assert.equal(sanitizeGothwadUsername('Pawan@gothwadtech.com'), 'pawan');
    assert.equal(buildHostPeerId('pawan@gothwadtech.com', 1), 'grd-pawan-slot-1');
    assert.equal(buildHostPeerId('pawan.kumar', 3), 'grd-pawan-kumar-slot-3');
    assert.equal(buildHostPeerId('pawan', 99), 'grd-pawan-slot-6');
  });

  it('matches Python Agent HMAC-SHA256 challenge-response byte-for-byte and blocks mode tampering', async () => {
    const pin = '849201';
    const nonce = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const viewer = 'pawan@gothwadtech.com';

    const browserProof = await computeAuthProof(pin, nonce, viewer, 'host_os');

    // Equivalent Python agent calculation: hmac.new(pin, f"{nonce}:{viewer}:{mode}", sha256)
    const pythonAgentExpected = createHmac('sha256', pin)
      .update(`${nonce}:pawan:host_os`)
      .digest('hex');

    assert.equal(browserProof, pythonAgentExpected);
    assert.equal(await verifyAuthProof(pin, nonce, 'pawan', 'host_os', browserProof), true);

    // Wrong PIN must fail
    assert.equal(await verifyAuthProof('000000', nonce, 'pawan', 'host_os', browserProof), false);

    // Tampering targetMode from hyperv_vm -> host_os must fail
    const vmProof = await computeAuthProof(pin, nonce, 'dost', 'hyperv_vm');
    assert.equal(await verifyAuthProof(pin, nonce, 'dost', 'host_os', vmProof), false);
  });

  it('detects *.gothwadtech.com production hosts for direct Accounts SSO cookies', () => {
    assert.equal(isProductionGothwadHost('remotedesktop.gothwadtech.com'), true);
    assert.equal(isProductionGothwadHost('gothwadtech.com'), true);
    assert.equal(isProductionGothwadHost('localhost'), false);
    assert.equal(isProductionGothwadHost('3000-sandbox.e2b.app'), false);
  });
});
