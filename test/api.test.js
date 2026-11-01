require('dotenv').config();
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');

let server;
let baseUrl;
const testToken = process.env.API_TOKEN || '155cdf21692f77bab2bed444a10eb33c';
const testDeviceId = 'device_test_auto_' + Date.now();

before(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/google_transfer';
  await mongoose.connect(uri);

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.close();
});

describe('Backend API Endpoints', () => {
  test('GET /health returns 200 and db status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.database, 'connected');
  });

  test('POST /api/v1/sync fails without Authorization header', async () => {
    const res = await fetch(`${baseUrl}/api/v1/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: testDeviceId, messages: [], locations: [] }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error);
  });

  test('POST /api/v1/sync fails with wrong API token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer 00000000000000000000000000000000',
      },
      body: JSON.stringify({ deviceId: testDeviceId, messages: [], locations: [] }),
    });
    assert.equal(res.status, 401);
  });

  test('POST /api/v1/sync successfully syncs messages and locations with valid token', async () => {
    const payload = {
      deviceId: testDeviceId,
      messages: [
        {
          clientId: 'msg_1',
          body: 'Hello from automated test',
          createdAt: new Date().toISOString(),
        },
      ],
      locations: [
        {
          clientId: 'loc_1',
          latitude: 19.076,
          longitude: 72.8777,
          accuracy: 12.5,
          capturedAt: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.deviceId, testDeviceId);
    assert.equal(data.syncedMessages, 1);
    assert.equal(data.syncedLocations, 1);
  });

  test('GET /api/v1/data/:deviceId/locations returns the saved location', async () => {
    const res = await fetch(`${baseUrl}/api/v1/data/${testDeviceId}/locations`, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.count, 1);
    assert.equal(data.locations[0].clientId, 'loc_1');
    assert.equal(data.locations[0].latitude, 19.076);
  });

  test('DELETE /api/v1/data/:deviceId/locations deletes locations for device', async () => {
    const res = await fetch(`${baseUrl}/api/v1/data/${testDeviceId}/locations`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.deletedCount, 1);

    // Verify deletion
    const verifyRes = await fetch(`${baseUrl}/api/v1/data/${testDeviceId}/locations`, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.count, 0);
  });
});
