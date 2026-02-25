"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Moon, Bell, Shield, User, Save, Trash2, AlertTriangle } from "lucide-react";

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-primary" : "bg-muted"
      }`}
    >
      <motion.span
        layout
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm"
        animate={{ x: enabled ? 24 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [name, setName] = useState("Arjun Modi");
  const [email, setEmail] = useState("arjun@example.com");
  const [school, setSchool] = useState("UC Berkeley");
  const [major, setMajor] = useState("Computer Science");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and preferences</p>
      </motion.div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Profile Settings
            </CardTitle>
            <CardDescription className="text-xs">Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 pb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xl font-bold text-white">
                AM
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
                <Badge variant="secondary" className="text-[10px] mt-1 bg-primary/20 text-primary border-primary/20">
                  Pro Plan
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm bg-muted/40 border-border focus:border-primary/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm bg-muted/40 border-border focus:border-primary/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">School</label>
                <Input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="h-9 text-sm bg-muted/40 border-border focus:border-primary/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Major</label>
                <Input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="h-9 text-sm bg-muted/40 border-border focus:border-primary/50"
                />
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleSave}
              className={`gap-2 transition-all ${
                saved
                  ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription className="text-xs">Control your app experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: Moon,
                label: "Dark Mode",
                desc: "Use dark theme across the application",
                state: darkMode,
                toggle: () => setDarkMode(!darkMode),
              },
              {
                icon: Bell,
                label: "Email Alerts",
                desc: "Receive match score updates and job alerts via email",
                state: emailAlerts,
                toggle: () => setEmailAlerts(!emailAlerts),
              },
              {
                icon: Bell,
                label: "Weekly Report",
                desc: "Get a weekly summary of your application performance",
                state: weeklyReport,
                toggle: () => setWeeklyReport(!weeklyReport),
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <ToggleSwitch enabled={item.state} onToggle={item.toggle} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-red-500/20 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-xs">Irreversible actions — proceed with caution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <div>
                <p className="text-sm font-medium text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Delete Account</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                      This action cannot be undone. All your data, resume analyses, and match scores will be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" className="border-border text-foreground hover:bg-accent" size="sm">
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                      Yes, Delete My Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
