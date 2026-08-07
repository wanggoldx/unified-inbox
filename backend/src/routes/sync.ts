import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { syncEmailsForUser } from "../services/emailSyncService.js";

const router = Router();

router.post("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await syncEmailsForUser(req.user!.id);
    const totalNew = results.reduce((sum, r) => sum + r.result.newEmails, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.result.updatedEmails, 0);

    res.json({
      message: "Sync completed",
      totalNew,
      totalUpdated,
      accounts: results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
