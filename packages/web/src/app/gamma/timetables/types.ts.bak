// Types for the Timetables page
export interface TimetableItem {
  id: string;
  title: string;
  content: string[];
  startTime: string;
  duration: number;
  endTime: string;
}

export interface TimetableData {
  startTime: string;
  items: TimetableItem[];
  totalDuration: number;
}

export interface Presentation {
  id: string;
  title: string;
  presentationUrl: string;
  startTime: string;
  totalDuration: number;
  slideCount: number;
  timetableData: TimetableData;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableCardProps {
  presentation: Presentation;
  onView: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}