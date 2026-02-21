"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Shield, Lock, Smartphone, Globe, Mail } from "lucide-react"

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
                    <p className="text-slate-500 mt-1">Manage your notification preferences and security settings.</p>
                </div>

                <div className="grid gap-6">
                    {/* Notifications Setting */}
                    <Card className="rounded-[32px] border-slate-200/60 shadow-sm overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-2 rounded-xl bg-purple-50">
                                    <Bell className="h-4 w-4 text-purple-600" />
                                </div>
                                <CardTitle className="text-lg">Notifications</CardTitle>
                            </div>
                            <CardDescription>Choose how you want to be notified about updates.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-slate-700">Email Notifications</Label>
                                    <p className="text-xs text-slate-400">Receive event updates and vendor messages via email.</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="h-px bg-slate-100" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-slate-700">Push Notifications</Label>
                                    <p className="text-xs text-slate-400">Receive real-time alerts on your browser.</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Privacy & Security */}
                    <Card className="rounded-[32px] border-slate-200/60 shadow-sm overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-2 rounded-xl bg-blue-50">
                                    <Shield className="h-4 w-4 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg">Privacy & Security</CardTitle>
                            </div>
                            <CardDescription>Keep your account secure and manage visibility.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-slate-700">Two-Factor Authentication</Label>
                                    <p className="text-xs text-slate-400">Add an extra layer of security to your account.</p>
                                </div>
                                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-xs font-bold">ENABLE</Button>
                            </div>
                            <div className="h-px bg-slate-100" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-slate-700">Change Password</Label>
                                    <p className="text-xs text-slate-400">Update your account password regularly.</p>
                                </div>
                                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-xs font-bold">UPDATE</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
