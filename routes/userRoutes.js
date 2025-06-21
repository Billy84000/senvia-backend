import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

console.log("✅ SUPABASE_URL =", process.env.SUPABASE_URL); // debug temporaire

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Supprimer un utilisateur
router.post("/deleteUser", async (req, res) => {
  const { user_id } = req.body;
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  if (!user_id) return res.status(400).json({ error: "user_id requis" });

  try {
    const { error } = await supabase.auth.admin.deleteUser(user_id);
    if (error) throw error;
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lister tous les utilisateurs (optionnel)
router.get("/listUsers", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    res.json({ users: data.users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  console.log("✅ SUPABASE_URL =", process.env.SUPABASE_URL);
});

export default router;
