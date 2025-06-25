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
});

// Ping pour test et UptimeRobot
router.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

// Désactiver un utilisateur
router.post("/disableUser", async (req, res) => {
  const { user_id } = req.body;
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  if (!user_id) return res.status(400).json({ error: "user_id requis" });

  try {
    const { error } = await supabase.auth.admin.updateUserById(user_id, { banned: true });
    if (error) throw error;
    res.json({ message: "Utilisateur désactivé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Réactiver un utilisateur
router.post("/enableUser", async (req, res) => {
  const { user_id } = req.body;
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  if (!user_id) return res.status(400).json({ error: "user_id requis" });

  try {
    const { error } = await supabase.auth.admin.updateUserById(user_id, { banned: false });
    if (error) throw error;
    res.json({ message: "Utilisateur réactivé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rechercher un utilisateur par email
router.get("/getUserByEmail", async (req, res) => {
  const email = req.query.email;
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  if (!email) return res.status(400).json({ error: "email requis" });

  try {
    const { data, error } = await supabase.auth.admin.listUsers({ email });
    if (error) throw error;
    res.json({ user: data.users[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/setUserRole", async (req, res) => {
  const { email, role, super_admin } = req.body;
  const adminKey = req.headers["x-admin-key"];

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  if (!email || !role) return res.status(400).json({ error: "email et role requis" });

  try {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ email });
    if (listError) throw listError;

    const user = usersData?.users?.[0];
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const user_id = user.id;
    const currentProvider = user.app_metadata?.provider || "email";

    const { data, error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
      app_metadata: {
        provider: currentProvider,
        role,
        roles: [role],
        super_admin: super_admin === true
      }
    });

    if (updateError) throw updateError;

    res.json({ message: `Rôle '${role}' attribué à ${email} (super_admin=${super_admin})`, user: data });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Modifier le rôle (app_metadata)
router.post("/setAdminRole", async (req, res) => {
  const { email } = req.body;
  const adminKey = req.headers["x-admin-key"];

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  if (!email) return res.status(400).json({ error: "email requis" });

  try {
    // 1. Rechercher l'utilisateur par email
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ email });
    if (listError) throw listError;

    const user = usersData?.users?.[0];
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const user_id = user.id;
    const currentProvider = user.app_metadata?.provider || "email";

    // 2. Mise à jour du rôle dans app_metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
      app_metadata: {
        provider: currentProvider,
        role: "admin",
        roles: ["admin"]
      }
    });
    if (updateError) throw updateError;

    res.json({ message: `Rôle 'admin' assigné à ${email}`, user: updatedUser });
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/updateUserMetadata", async (req, res) => {
  const { user_id, metadata } = req.body;
  const adminKey = req.headers["x-admin-key"];

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  if (!user_id || !metadata) return res.status(400).json({ error: "user_id et metadata requis" });

  try {
    const { data, error } = await supabase.auth.admin.updateUserById(user_id, {
      user_metadata: metadata
    });
    if (error) throw error;
    res.json({ message: "Metadata mise à jour", user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
