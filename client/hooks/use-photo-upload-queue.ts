// Re-export for panels (Culinary2, Pastry2, Gallery) that use @/hooks/use-photo-upload-queue
export {
  usePhotoUploadQueue,
  MAX_QUEUE_SIZE,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  SUPPORTED_FORMATS,
  type QueuedPhoto,
} from "../modules/Culinary/client/hooks/use-photo-upload-queue";
