import { DeviceAuthSimulator } from '../auth/simulator';
import { TimetableData, PresentationSaveRequest } from '../types';

/**
 * Generate mock Gamma presentation data
 */
export function generateMockPresentation(url?: string): {
  url: string;
  data: TimetableData;
} {
  const presentationUrl = url || 'https://gamma.app/docs/mock-presentation-' + Date.now();

  const slides = [
    { title: 'Introduction to TypeScript', duration: 5 },
    { title: 'Setting Up Your Environment', duration: 8 },
    { title: 'Basic Types and Interfaces', duration: 12 },
    { title: 'Advanced Type Features', duration: 15 },
    { title: 'Generics Deep Dive', duration: 10 },
    { title: 'Decorators and Metadata', duration: 10 },
    { title: 'Integration with React', duration: 12 },
    { title: 'Best Practices', duration: 8 },
  ];

  const items = slides.map((slide, idx) => ({
    id: `slide-${idx + 1}`,
    title: slide.title,
    duration: slide.duration,
    startTime: undefined,
    endTime: undefined,
    content: `Content for ${slide.title}`,
  }));

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

  return {
    url: presentationUrl,
    data: {
      title: 'TypeScript Workshop',
      items,
      startTime: '09:00',
      totalDuration,
    },
  };
}

/**
 * Save presentation to API
 */
export async function savePresentationToAPI(
  auth: DeviceAuthSimulator,
  presentationUrl: string,
  timetableData: TimetableData
): Promise<any> {
  console.log('\n💾 Saving presentation...');
  console.log('URL:', presentationUrl);
  console.log('Title:', timetableData.title);
  console.log('Slides:', timetableData.items.length);
  console.log('Total Duration:', timetableData.totalDuration, 'minutes');

  // Normalize items to match API validation
  const normalizedItems = timetableData.items.map(item => ({
    id: String(item.id),
    title: String(item.title),
    duration: Number(item.duration),
    startTime: item.startTime,
    endTime: item.endTime,
    content: item.content,
  }));

  const requestData: PresentationSaveRequest = {
    gamma_url: presentationUrl,
    title: timetableData.title,
    start_time: timetableData.startTime,
    total_duration: timetableData.totalDuration,
    timetable_data: {
      title: timetableData.title,
      items: normalizedItems,
      startTime: timetableData.startTime,
      totalDuration: timetableData.totalDuration,
    },
  };

  console.log('\n📤 Request payload:');
  console.log(JSON.stringify(requestData, null, 2));

  try {
    const response = await auth.authorizedFetch('/api/presentations/save', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    console.log('\n📥 Response Status:', response.status);
    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }
      throw new Error(`Save failed: ${response.status} - ${errorData.error || responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('\n✅ Presentation saved successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('\n❌ Save failed:', error);
    throw error;
  }
}

/**
 * Save with retry logic (exponential backoff)
 */
export async function savePresentationWithRetry(
  auth: DeviceAuthSimulator,
  presentationUrl: string,
  timetableData: TimetableData,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🔄 Save attempt ${attempt}/${maxRetries}...`);
      return await savePresentationToAPI(auth, presentationUrl, timetableData);
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 1000;
        console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Save failed after all retries');
}
