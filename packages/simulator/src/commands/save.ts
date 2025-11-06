/**
 * Save Command
 * Tests saving presentation data using authenticated API
 */

import { DeviceAuth } from '../auth/device-auth-wrapper.js';
import { FileStorageManager } from '../storage/file-storage.js';
import { logger } from '../utils/logger.js';
import { getEnvironmentConfig } from '../config/environment.js';

export async function saveCommand(options: {
  env: 'local' | 'production';
  url: string;
  title?: string;
}): Promise<void> {
  try {
    const config = getEnvironmentConfig(options.env);
    const storage = new FileStorageManager();
    const deviceAuth = new DeviceAuth(storage);

    logger.section(`Save Presentation (${options.env})`);

    // Check authentication
    const token = await deviceAuth.getValidTokenOrRefresh(config.apiBaseUrl);
    if (!token) {
      logger.error('Not authenticated. Run pairing first: npm run simulator -- pair --env ' + options.env);
      return;
    }

    logger.info('Authenticated with token: ' + token.token.substring(0, 20) + '...');

    // Prepare test data
    const timetableData = {
      title: options.title || 'Test Presentation',
      items: [
        { id: '1', title: 'Introduction', duration: 10, startTime: '09:00', endTime: '09:10' },
        { id: '2', title: 'Main Content', duration: 20, startTime: '09:10', endTime: '09:30' },
        { id: '3', title: 'Conclusion', duration: 5, startTime: '09:30', endTime: '09:35' },
      ],
      startTime: '09:00',
      totalDuration: 35,
    };

    logger.info('Saving presentation...');
    logger.kv('URL', options.url);
    logger.kv('Title', timetableData.title);

    // Make authorized request
    const response = await deviceAuth.authorizedFetch(
      config.apiBaseUrl,
      '/api/presentations/save',
      {
        method: 'POST',
        body: JSON.stringify({
          gamma_url: options.url,
          title: timetableData.title,
          start_time: timetableData.startTime,
          total_duration: timetableData.totalDuration,
          timetable_data: timetableData,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error('Save failed:', error);
      return;
    }

    const result = await response.json();
    logger.success('Presentation saved successfully!');
    logger.kv('Response', JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error('Save failed:', error);
    throw error;
  }
}
