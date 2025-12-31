"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platformName: "Business Orbit",
    allowRegistration: true,
    requireApproval: true,
    maxEventsPerUser: 5,
    emailNotifications: true,
    maintenanceMode: false,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 lg:ml-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Platform Settings</h1>
          <p className="text-muted-foreground">Configure your Business Orbit platform</p>
        </div>

        {/* General Settings */}
        <Card className="p-6 shadow-elevated border-border/50 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => handleSettingChange("platformName", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxEvents">Maximum Events Per User</Label>
              <Select
                value={settings.maxEventsPerUser.toString()}
                onValueChange={(value) => handleSettingChange("maxEventsPerUser", parseInt(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* User Management Settings */}
        <Card className="p-6 shadow-elevated border-border/50 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">User Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowRegistration">Allow New Registrations</Label>
                <p className="text-sm text-muted-foreground">Enable or disable new user registration</p>
              </div>
              <Switch
                id="allowRegistration"
                checked={settings.allowRegistration}
                onCheckedChange={(checked) => handleSettingChange("allowRegistration", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requireApproval">Require Admin Approval</Label>
                <p className="text-sm text-muted-foreground">New users need admin approval to join</p>
              </div>
              <Switch
                id="requireApproval"
                checked={settings.requireApproval}
                onCheckedChange={(checked) => handleSettingChange("requireApproval", checked)}
              />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 shadow-elevated border-border/50 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send email notifications to users</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
              />
            </div>
          </div>
        </Card>

        {/* System Settings */}
        <Card className="p-6 shadow-elevated border-border/50 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">System Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Put the platform in maintenance mode</p>
              </div>
              <Switch
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSettingChange("maintenanceMode", checked)}
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline">Reset to Defaults</Button>
          <Button>Save Settings</Button>
        </div>
        </div>
      </div>
    </div>
  );
}
