jest.mock("axios", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };

  return {
    get: mockAxiosInstance.get,
    post: mockAxiosInstance.post,
    create: jest.fn(() => mockAxiosInstance)
  };
});