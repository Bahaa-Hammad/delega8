// test/api/models/models.e2e-spec.ts

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { getApp, getUserTokens, getAdminTokens } from '../../setupAfterEnv';
import { ModelEntity } from 'src/api/models/model.entity';
import { ModelAvailability, ModelProvider } from 'src/api/models/enums';

/**
 * Helper to generate a random suffix for model names
 * so each test run can avoid unique-constraint collisions.
 */
function randomSuffix() {
  return Math.random().toString(36).substring(2, 8);
}

describe('ModelsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  /**
   * We'll collect the IDs of all created models so we can clean them up.
   */
  const createdModelIds: string[] = [];

  beforeAll(async () => {
    // 1) Retrieve the app from global setup
    app = getApp();

    // 2) If you need the underlying data source:
    dataSource = app.get(DataSource);

    console.log('ModelsController test suite starting');
  });

  afterAll(async () => {
    // Clean up any created models
    const { token: adminToken } = getAdminTokens();
    for (const modelId of createdModelIds) {
      try {
        await request(app.getHttpServer())
          .delete(`/models/${modelId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      } catch (err) {
        // It's okay if already deleted by a test or doesn't exist
      }
    }
  });

  describe('CREATE (POST /models)', () => {
    it('should fail if non-admin tries to create a model', async () => {
      const { accessToken } = getUserTokens(); // normal user
      const payload = {
        name: `Non-Admin Model ${randomSuffix()}`,
        provider: 'OPENAI',
      };

      await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(403); // Forbidden by the AdminGuard
    });

    it('should create a model if admin, and not return apiKey in response', async () => {
      const { token } = getAdminTokens();
      const payload = {
        name: `Admin Model ${randomSuffix()}`,
        provider: ModelProvider.OPENAI,
        apiKey: 'secret-key-123',
      };

      const { body } = await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      // Track created model
      createdModelIds.push(body.id);

      expect(body.id).toBeDefined();
      expect(body.name).toBe(payload.name);
      expect(body.provider).toBe(ModelProvider.OPENAI);
      // Because we have select: false on apiKey, it shouldn't appear in response
      expect(body.apiKey).toBeUndefined();
    });

    it('should store apiKey as encrypted in DB', async () => {
      const { token } = getAdminTokens();
      const payload = {
        name: `Encryption Test Model ${randomSuffix()}`,
        provider: ModelProvider.OPENAI,
        apiKey: 'my-super-secret',
      };

      const createRes = await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      const createdId = createRes.body.id;
      createdModelIds.push(createdId);

      // Direct DB check that it's not stored as plaintext
      const rawResult = await dataSource.query(
        `SELECT "apiKey" FROM "models" WHERE id = $1`,
        [createdId],
      );
      expect(rawResult.length).toBe(1);
      const storedApiKey = rawResult[0].apiKey;
      expect(storedApiKey).toBeDefined();
      expect(storedApiKey).not.toBe(payload.apiKey);

      // Confirm typeorm-encrypted decrypted it properly
      const modelRepo = dataSource.getRepository(ModelEntity);
      const loaded = await modelRepo
        .createQueryBuilder('model')
        .where('model.id = :id', { id: createdId })
        .addSelect('model.apiKey')
        .getOne();

      expect(loaded.apiKey).toBe(payload.apiKey);
    });

    // Optional: If you have ValidationPipe with a DTO
    it('should fail if payload is invalid', async () => {
      const { token } = getAdminTokens();
      const invalidPayload = {}; // missing 'name', 'provider'

      const { body } = await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidPayload)
        .expect(400); // or whatever your validation throws

      expect(body.message).toContain('name should not be empty'); // example message
    });
  });

  describe('READ', () => {
    let readModelId: string;

    beforeAll(async () => {
      // Create a model to read
      const { token } = getAdminTokens();
      const payload = {
        name: `Read Model ${randomSuffix()}`,
        provider: 'OPENAI',
      };

      const { body } = await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      readModelId = body.id;
      createdModelIds.push(readModelId);
    });

    it('(GET /models) -> any logged-in user can list models', async () => {
      const { accessToken } = getUserTokens();

      const { body } = await request(app.getHttpServer())
        .get('/models')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(body)).toBe(true);
      // Should include the model we just created
      const found = body.find((m: any) => m.id === readModelId);
      expect(found).toBeDefined();
    });

    it('(GET /models/:id) -> any logged-in user can fetch a model', async () => {
      const { accessToken } = getUserTokens();

      const { body } = await request(app.getHttpServer())
        .get(`/models/${readModelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(body.id).toBe(readModelId);
      // Should not include apiKey
      expect(body.apiKey).toBeUndefined();
    });
    it('(GET /models/name/:name) -> find by name', async () => {
      const { token: adminToken } = getAdminTokens(); // We need admin to create a model
      const { accessToken } = getUserTokens(); // A normal user can read if that's your requirement

      // 1) Generate a random name for uniqueness
      const name = `test-model-${randomSuffix()}`;
      const payload = {
        name,
        provider: 'OPENAI',
      };

      // 2) Create the model using admin
      const createRes = await request(app.getHttpServer())
        .post('/models') // route: POST /models
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const createdId = createRes.body.id;
      expect(createdId).toBeDefined();

      // 3) Keep track so we can delete later in afterAll
      createdModelIds.push(createdId);

      // 4) Fetch the model by name (any logged-in user can read if that’s your requirement)
      const { body: fetched } = await request(app.getHttpServer())
        .get(`/models/name/${encodeURIComponent(name)}`) // must encode if name has spaces/special chars
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 5) Verify it matches the created model
      expect(fetched.id).toBe(createdId);
      expect(fetched.name).toBe(name);
    });

    it('(GET /models/available) -> returns only enabled models', async () => {
      const { accessToken } = getUserTokens();

      const { body } = await request(app.getHttpServer())
        .get('/models/available')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // The 'Read Model' should appear if it's still in default "ENABLED"
      const found = body.find((m: any) => m.id === readModelId);
      expect(found).toBeDefined();
      expect(found.availability).toBe(ModelAvailability.ENABLED);
    });
  });

  describe('UPDATE (PATCH /models/:id)', () => {
    let updateModelId: string;

    beforeAll(async () => {
      // Create a model to update
      const { token } = getAdminTokens();
      const payload = {
        name: `Update Model ${randomSuffix()}`,
        provider: 'OPENAI',
      };

      const { body } = await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      updateModelId = body.id;
      createdModelIds.push(updateModelId);
    });

    it('non-admin user should fail to update', async () => {
      const { accessToken } = getUserTokens();
      await request(app.getHttpServer())
        .patch(`/models/${updateModelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Failing Update' })
        .expect(403);
    });

    it('admin can update the model', async () => {
      const { token } = getAdminTokens();
      const newName = `Updated Model Name ${randomSuffix()}`;

      const { body } = await request(app.getHttpServer())
        .patch(`/models/${updateModelId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: newName })
        .expect(200);

      expect(body.id).toBe(updateModelId);
      expect(body.name).toBe(newName);
    });
  });

  describe('TOGGLE AVAILABILITY (PATCH /models/:id/toggle-availability)', () => {
    let toggleModelId: string;

    beforeAll(async () => {
      // Create a model to toggle
      const { token } = getAdminTokens();
      const payload = {
        name: `Toggle Model ${randomSuffix()}`,
        provider: 'OPENAI',
      };

      const { body } = await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      toggleModelId = body.id;
      createdModelIds.push(toggleModelId);
    });

    it('should fail if user is not admin', async () => {
      const { accessToken } = getUserTokens();

      await request(app.getHttpServer())
        .patch(`/models/${toggleModelId}/toggle-availability`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('admin can toggle the availability', async () => {
      const { token } = getAdminTokens();

      // 1) Fetch current availability
      const getRes = await request(app.getHttpServer())
        .get(`/models/${toggleModelId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const oldAvailability = getRes.body.availability;

      // 2) Toggle
      const toggleRes = await request(app.getHttpServer())
        .patch(`/models/${toggleModelId}/toggle-availability`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const newAvailability = toggleRes.body.availability;
      expect(newAvailability).not.toBe(oldAvailability);

      // 3) Confirm toggling back
      const toggleRes2 = await request(app.getHttpServer())
        .patch(`/models/${toggleModelId}/toggle-availability`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(toggleRes2.body.availability).toBe(oldAvailability);
    });
  });

  describe('DELETE (DELETE /models/:id)', () => {
    let deleteModelId: string;

    beforeAll(async () => {
      // Create a model for deletion
      const { token } = getAdminTokens();
      const payload = {
        name: `Delete Model ${randomSuffix()}`,
        provider: 'OPENAI',
      };

      const { body } = await request(app.getHttpServer())
        .post('/models')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      deleteModelId = body.id;
      createdModelIds.push(deleteModelId);
    });

    it('non-admin user should fail to delete', async () => {
      const { accessToken } = getUserTokens();
      await request(app.getHttpServer())
        .delete(`/models/${deleteModelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('admin can delete the model', async () => {
      const { token } = getAdminTokens();

      await request(app.getHttpServer())
        .delete(`/models/${deleteModelId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Double check the model is gone
      await request(app.getHttpServer())
        .get(`/models/${deleteModelId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
