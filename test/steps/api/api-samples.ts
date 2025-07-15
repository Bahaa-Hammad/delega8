// test/steps/api/api-real-samples.ts
import { ApiStepSpec } from '@src/core/steps/steps/api/types';

export const realGetStep: ApiStepSpec = {
  id: 'jsonplaceholder-get',
  type: 'api',
  name: 'Real GET to JSONPlaceholder',
  verb: 'GET',
  baseUrl: 'https://jsonplaceholder.typicode.com/posts/{postId}',
  query: {},
  headers: {},
  body: undefined,
  outputNamespace: 'apiOutput',
  isLoop: false,
  loopOn: undefined,
  conditions: [],
};

export const realPostStep: ApiStepSpec = {
  id: 'jsonplaceholder-post',
  type: 'api',
  name: 'Real POST to JSONPlaceholder',
  verb: 'POST',
  baseUrl: 'https://jsonplaceholder.typicode.com/posts',
  query: {},
  headers: {
    'Content-Type': 'application/json',
  },
  body: {
    title: '{title}',
    body: '{body}',
    userId: '{userId}',
  },
  outputNamespace: 'apiOutput',
  isLoop: false,
  loopOn: undefined,
  conditions: [],
};
