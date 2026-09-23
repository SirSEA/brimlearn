import type { Express } from "express";
import { getSiteImage } from "../db";

/**
 * Serves admin-uploaded landing-page images (stored base64 in Firestore) with
 * a long cache lifetime. Any id missing from Firestore 404s like a normal file.
 */
export function registerSiteImageRoutes(app: Express) {
  app.get("/site-images/:id", async (req, res) => {
    const id = (req.params as Record<string, string>).id;
    if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
      res.status(400).send("Bad image id");
      return;
    }

    try {
      const image = await getSiteImage(id);
      if (!image) {
        res.status(404).send("Not found");
        return;
      }
      const buffer = Buffer.from(image.dataBase64, "base64");
      res.set("Content-Type", image.mimeType);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.send(buffer);
    } catch (error) {
      console.error("[SiteImages] failed to serve:", error);
      res.status(502).send("Image service unavailable");
    }
  });
}