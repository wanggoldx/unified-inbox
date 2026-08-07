import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import {
  listAccounts,
  getGmailAuthUrl,
  handleGmailCallback,
  disconnectAccount,
} from "../controllers/accountController.js";

const router = Router();

router.get("/", authenticate, listAccounts);
router.get("/gmail", authenticate, getGmailAuthUrl);
router.get("/gmail/callback", handleGmailCallback);
router.delete("/:id", authenticate, disconnectAccount);

export default router;
