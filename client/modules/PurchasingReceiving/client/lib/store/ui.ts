import { LS, read, write } from "./shared";

type AnyRecord = Record<string, unknown>;

export interface ScannedImage {
  id: string;
  vendorCodeText: string;
  dataUrl: string;
  timestamp: string;
  outletId: string;
}

export interface ScannedVendorCodeMatch {
  id: string;
  vendorCodeText: string;
  outletId?: string | null;
  outletName?: string | null;
  matchedAt: string;
}

export const uiStore = {
  listImages(): AnyRecord[] {
    return read(LS.images, [] as AnyRecord[]);
  },

  saveImage(image: AnyRecord) {
    const list = this.listImages();
    const idx = list.findIndex((i) => i.id === image.id);
    if (idx >= 0) list[idx] = image;
    else list.unshift(image);

    write(LS.images, list.slice(0, 200));
    try {
      window.dispatchEvent(
        new CustomEvent("echo:image:save", { detail: image }),
      );
    } catch {
      /* ignore */
    }
  },

  deleteImage(imageId: string) {
    const list = this.listImages();
    write(
      LS.images,
      list.filter((i) => i.id !== imageId),
    );
  },

  listImagesByOutlet(outletId: string): AnyRecord[] {
    return this.listImages().filter((i) => i.outletId === outletId);
  },

  listScans(): ScannedImage[] {
    return read(LS.scans, [] as ScannedImage[]);
  },

  saveScan(scan: ScannedImage) {
    const list = this.listScans();
    const idx = list.findIndex((s) => s.id === scan.id);
    if (idx >= 0) list[idx] = scan;
    else list.unshift(scan);

    write(LS.scans, list.slice(0, 100));
    try {
      window.dispatchEvent(new CustomEvent("echo:scan:save", { detail: scan }));
    } catch {
      /* ignore */
    }
  },

  deleteScan(scanId: string) {
    const list = this.listScans();
    write(
      LS.scans,
      list.filter((s) => s.id !== scanId),
    );
  },

  deleteScans(predicate: (s: ScannedImage) => boolean) {
    const list = this.listScans();
    write(
      LS.scans,
      list.filter((s) => !predicate(s)),
    );
  },

  setScanAttachments(vendorCodeText: string, imageIds: string[]) {
    const list = this.listScans();
    const scan = list.find((s) => s.vendorCodeText === vendorCodeText);
    if (!scan) return;

    (scan as any).imageIds = imageIds;
    write(LS.scans, list);
  },

  recordVendorCodeMatch(match: ScannedVendorCodeMatch) {
    const list = this.listScans();
    const scan = list.find((s) => s.vendorCodeText === match.vendorCodeText);
    if (scan) {
      (scan as any).matchedAt = match.matchedAt;
      (scan as any).outletId = match.outletId ?? scan.outletId;
      (scan as any).outletName = match.outletName ?? (scan as any).outletName;
      scan.timestamp = match.matchedAt;
      write(LS.scans, list);
    }
  },
};
