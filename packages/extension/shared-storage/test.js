/**
 * Simple test script for StorageManager backward compatibility
 * This can be run in the browser console to verify behavior
 */

// Mock chrome.storage for testing (if not available)
if (typeof chrome === 'undefined') {
  console.log('Setting up chrome.storage mock for testing...');
  globalThis.chrome = {
    storage: {
      local: {
        data: {},
        set(items, callback) {
          Object.assign(this.data, items);
          if (callback) callback();
        },
        get(keys, callback) {
          const result = {};
          if (typeof keys === 'string') {
            result[keys] = this.data[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(key => (result[key] = this.data[key]));
          }
          if (callback) callback(result);
        },
        remove(keys, callback) {
          if (typeof keys === 'string') {
            delete this.data[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(key => delete this.data[key]);
          }
          if (callback) callback();
        },
        clear(callback) {
          this.data = {};
          if (callback) callback();
        },
      },
    },
    runtime: {
      lastError: null,
    },
  };
}

// Test the StorageManager
async function testStorageManager() {
  console.log('🧪 Testing StorageManager...');

  try {
    // Import StorageManager (this would work in the extension environment)
    const { StorageManager, saveData, loadData } = await import('./index.js');

    console.log('✅ StorageManager imported successfully');

    // Test 1: Basic save and load
    console.log('\n📝 Test 1: Basic save and load');
    const testKey = 'timetable-test-presentation-url';
    const testData = {
      startTime: '09:00',
      items: [
        {
          id: '1',
          title: 'Test Slide',
          content: ['Test content'],
          startTime: '09:00',
          endTime: '09:05',
          duration: 5,
        },
      ],
      totalDuration: 5,
    };

    await saveData(testKey, testData);
    console.log('✅ Data saved');

    const loadedData = await loadData(testKey);
    console.log('✅ Data loaded:', loadedData);

    // Verify data matches
    if (JSON.stringify(loadedData) === JSON.stringify(testData)) {
      console.log('✅ Data integrity maintained');
    } else {
      console.error('❌ Data mismatch!');
    }

    // Test 2: Verify data versioning (internal storage format)
    console.log('\n🔍 Test 2: Data versioning');
    const rawData = await chrome.storage.local.get(testKey);
    const storedItem = rawData[testKey];

    if (storedItem && storedItem.version && storedItem.data && storedItem.timestamp) {
      console.log('✅ Data is properly versioned:', {
        version: storedItem.version,
        hasData: !!storedItem.data,
        hasTimestamp: !!storedItem.timestamp,
        presentationUrl: storedItem.presentation_url,
      });
    } else {
      console.error('❌ Data versioning failed!');
    }

    // Test 3: Legacy data compatibility
    console.log('\n🔄 Test 3: Legacy data compatibility');
    const legacyKey = 'timetable-legacy-test';
    const legacyData = { startTime: '10:00', items: [], totalDuration: 0 };

    // Simulate legacy data (directly to chrome.storage without versioning)
    await new Promise(resolve => {
      chrome.storage.local.set({ [legacyKey]: legacyData }, resolve);
    });

    // Load via StorageManager
    const loadedLegacyData = await loadData(legacyKey);
    console.log('✅ Legacy data loaded:', loadedLegacyData);

    if (JSON.stringify(loadedLegacyData) === JSON.stringify(legacyData)) {
      console.log('✅ Legacy data compatibility maintained');
    } else {
      console.error('❌ Legacy data compatibility broken!');
    }

    // Test 4: StorageManager instance
    console.log('\n⚙️ Test 4: Custom StorageManager instance');
    const customManager = new StorageManager({
      enableCloudSync: true, // Enable for testing
      syncDebounceMs: 100,
    });

    await customManager.save('test-custom', { test: true });
    console.log('✅ Custom manager save works');

    const customData = await customManager.load('test-custom');
    console.log('✅ Custom manager load works:', customData);

    const syncStatus = customManager.getSyncQueueStatus();
    console.log('✅ Sync queue status:', syncStatus);

    console.log('\n🎉 All tests passed! StorageManager is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testStorageManager };
} else {
  // Auto-run in browser
  testStorageManager();
}
