'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { User, Save, Loader2 } from 'lucide-react'

export default function ProfilePage() {
    const { toast } = useToast()

    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        company: '',
        designation: '',
    })

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/session')
            const data = await res.json()
            if (data.user) {
                setUser(data.user)
                setFormData({
                    name: data.user.name || '',
                    company: data.user.company || '',
                    designation: data.user.designation || '',
                })
            }
        } catch (error) {
            console.error('Failed to fetch user:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const updates = {
                name: formData.name,
                company: formData.company,
                designation: formData.designation,
            }

            const res = await fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            })

            if (res.ok) {
                toast({ title: 'Success', description: 'Profile updated successfully' })
                await fetchUser()
            } else {
                toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 mx-auto animate-pulse">
                        <User className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-muted-foreground text-lg">Loading profile...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground text-xl">
                    Manage your personal information
                </p>
            </div>

            <Card className="border-0 shadow-enterprise bg-card">
                <CardHeader className="border-b">
                    <div className="flex items-center space-x-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Profile Information</CardTitle>
                            <CardDescription>
                                Update your personal details
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="h-11"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="bg-muted/50 h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email cannot be changed
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm font-medium">Company</Label>
                        <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            placeholder="Your company name"
                            className="h-11"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="designation" className="text-sm font-medium">Designation</Label>
                        <Input
                            id="designation"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            placeholder="Your role/title"
                            className="h-11"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="lg"
                            className="shadow-sm"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
