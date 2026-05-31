let capturedCreateConfig;
let mockInstance;

jest.mock('axios', () => {
  const mockPost = jest.fn();
  const mockCallable = jest.fn((config) => Promise.resolve({ config, data: {} }));
  mockInstance = Object.assign(mockCallable, {
    get: jest.fn(),
    post: mockPost,
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  });
  return {
    create: jest.fn((config) => {
      capturedCreateConfig = config;
      return mockInstance;
    }),
    post: mockPost,
  };
});

beforeEach(() => {
  capturedCreateConfig = null;
  localStorage.clear();
  jest.clearAllMocks();
  jest.resetModules();
  delete require.cache[require.resolve('../api')];
});

test('creates axios instance with correct baseURL', () => {
  require('../api');
  expect(capturedCreateConfig.baseURL).toBe('http://localhost:8000/api');
});

test('request interceptor adds auth header when token exists', () => {
  localStorage.setItem('access_token', 'test-token-123');
  require('../api');

  const handler = mockInstance.interceptors.request.use.mock.calls[0][0];
  const config = { headers: {} };
  const result = handler(config);

  expect(result.headers.Authorization).toBe('Bearer test-token-123');
});

test('request interceptor does not add auth header when no token', () => {
  require('../api');

  const handler = mockInstance.interceptors.request.use.mock.calls[0][0];
  const config = { headers: {} };
  const result = handler(config);

  expect(result.headers.Authorization).toBeUndefined();
});

test('response interceptor calls use with error handler', () => {
  require('../api');

  expect(mockInstance.interceptors.response.use).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
  );
});

test('response interceptor refreshes token on 401', async () => {
  localStorage.setItem('refresh_token', 'refresh-token-abc');
  localStorage.setItem('access_token', 'expired-token');
  require('../api');

  const errorHandler = mockInstance.interceptors.response.use.mock.calls[0][1];

  mockInstance.post.mockResolvedValueOnce({
    data: { access: 'new-access-token' },
  });

  const error = {
    config: { headers: {}, _retry: false },
    response: { status: 401 },
  };

  const result = await errorHandler(error);

  expect(result.config.headers.Authorization).toBe('Bearer new-access-token');
  expect(localStorage.getItem('access_token')).toBe('new-access-token');
});

test('response interceptor redirects to login on refresh failure', async () => {
  delete window.location;
  window.location = { href: '' };

  localStorage.setItem('refresh_token', 'invalid-refresh');
  require('../api');

  const errorHandler = mockInstance.interceptors.response.use.mock.calls[0][1];

  mockInstance.post.mockRejectedValueOnce(new Error('Invalid refresh'));

  const error = {
    config: { headers: {}, _retry: false },
    response: { status: 401 },
  };

  await expect(errorHandler(error)).rejects.toBe(error);
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(window.location.href).toBe('/login');
});
