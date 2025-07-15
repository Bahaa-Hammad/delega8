export default async function globalTeardown() {
  console.log('Global Teardown Starting');
  const app = (global as any).__APP__;
  if (app) {
    await app.close();
  }
  console.log('Global Teardown Completed');
}
