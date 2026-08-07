import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listEmails,
  getEmailDetail,
  toggleRead,
  deleteEmail,
  archiveEmail,
  searchEmails,
} from "../controllers/emailController.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchEmails);
router.get("/", listEmails);
router.get("/:id", getEmailDetail);
router.put("/:id/read", toggleRead);
router.delete("/:id", deleteEmail);
router.post("/:id/archive", archiveEmail);

export default router;
