export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
export interface GeneratedImage {
  id: string;
  project_id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}
export interface GenerateImageRequest {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
  project_id?: string;
}
export interface GenerateImageResponse {
  success: boolean;
  image_url?: string;
  error?: string;
  message?: string;
}
