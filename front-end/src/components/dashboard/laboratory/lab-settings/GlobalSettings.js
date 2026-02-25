import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Grid,
    CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '@/assets/hooks/use-auth';
import { fetchLabSettings, updateLabSettings } from '@/redux/service/laboratory';

const GlobalSettings = () => {
    const auth = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        default_tat_minutes: 60
    });

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetchLabSettings(auth);
            setSettings(response);
        } catch (error) {
            console.error("Failed to fetch lab settings", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (auth?.token) {
            fetchSettings();
        }
    }, [auth]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateLabSettings(settings, auth);
            toast.success("Settings saved successfully");
        } catch (error) {
            console.error("Failed to save settings", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                Global Laboratory Settings
            </Typography>

            <Card sx={{ maxWidth: 600, borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ p: 4 }}>
                    <form onSubmit={handleSave}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Default Turnaround Time (TAT)
                                </Typography>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Goal in Minutes"
                                    value={settings.default_tat_minutes}
                                    onChange={(e) => setSettings({ ...settings, default_tat_minutes: parseInt(e.target.value) || 0 })}
                                    helperText="This goal will be applied to all tests that don't have a specific TAT set in their panel configuration."
                                />
                            </Grid>

                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                <Button
                                    variant="contained"
                                    type="submit"
                                    disabled={saving}
                                    sx={{ borderRadius: 2, px: 4 }}
                                >
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default GlobalSettings;
