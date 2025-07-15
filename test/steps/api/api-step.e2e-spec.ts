// test/steps/api/api-real.e2e-spec.ts

import { createApiStepDirect } from '@src/core/steps/steps/api/api';
import { realGetStep, realPostStep } from './api-samples';
/**
 * A suite that makes REAL API calls to JSONPlaceholder
 * (no mocking).
 */
describe('API Step - Real Calls (e2e)', () => {
  // Because these are real network calls,
  // you may want to increase the timeout.
  beforeAll(() => {
    jest.setTimeout(30_000);
  });

  it('should GET a post from JSONPlaceholder', async () => {
    // 1) Build the step
    const apiStep = createApiStepDirect(realGetStep);

    // 2) Our test context has placeholders for {postId}
    const context = {
      postId: '1',
    };

    // 3) Call the step
    const result = await apiStep.func(context);

    // 4) Expect an actual response from JSONPlaceholder
    // Typically, GET /posts/1 returns:
    //  {
    //    userId: 1,
    //    id: 1,
    //    title: "some title",
    //    body: "some body"
    //  }
    // So let's do a minimal check
    expect(result.statusCode).toBe(200);
    expect(result.responseBody).toHaveProperty('id', 1);
    expect(result.responseBody).toHaveProperty('title');
    expect(result.responseBody).toHaveProperty('body');
  });

  it('should POST a new post to JSONPlaceholder', async () => {
    const apiStep = createApiStepDirect(realPostStep);

    const context = {
      title: 'Test Title',
      body: 'This is a test post body',
      userId: '99',
    };

    const result = await apiStep.func(context);

    // JSONPlaceholder typically returns status 201 for a created resource,
    // along with an "id" property in the body (like { id: 101 }).
    expect(result.statusCode).toBe(201);
    expect(result.responseBody).toHaveProperty('id');
    // The rest is up to you.
    // e.g. check that the responseBody.title => 'Test Title'
    expect(result.responseBody).toHaveProperty('title', 'Test Title');
    expect(result.responseBody).toHaveProperty(
      'body',
      'This is a test post body',
    );
    expect(result.responseBody).toHaveProperty('userId', '99');
  });
});
