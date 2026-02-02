// Jest setup file for browser extension testing

// Mock browser/chrome API
const mockStorage = {
  data: {},
  get: jest.fn((keys) => {
    return Promise.resolve(
      keys.reduce((acc, key) => {
        if (mockStorage.data[key] !== undefined) {
          acc[key] = mockStorage.data[key];
        }
        return acc;
      }, {})
    );
  }),
  set: jest.fn((items) => {
    Object.assign(mockStorage.data, items);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockStorage.data = {};
    return Promise.resolve();
  })
};

// Create browser API mock
global.browser = {
  storage: {
    local: mockStorage
  }
};

// Create chrome API mock (for Chromium browsers)
global.chrome = {
  storage: {
    local: mockStorage
  }
};

// Reset storage between tests
beforeEach(() => {
  mockStorage.data = {};
  mockStorage.get.mockClear();
  mockStorage.set.mockClear();
});

// Mock HTMLMediaElement.prototype.playbackRate
Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
  get: function() {
    return this._playbackRate || 1;
  },
  set: function(value) {
    this._playbackRate = value;
  }
});
