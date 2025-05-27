export interface Booking {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

export interface Document {
  id: string;
  type: string;
  url: string;
  booking: Booking | null;
  uploaded_at: string;
  updated_at: string;
} 