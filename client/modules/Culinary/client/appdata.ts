/**
 * Culinary module's AppData barrel.
 * Import from here to use Culinary's own AppDataContext (not the shared EchoRecipePro one).
 */
export { AppDataProvider, useAppData } from "./context/AppDataContext";
export type {
  Recipe,
  GalleryImage,
  LookBook,
  TileBoard,
  TileBoardTile,
} from "./context/AppDataContext";
