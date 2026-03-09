export const getVitalSignColor = (key, value, settings) => {
    if (!settings || !settings.is_active || value === null || value === undefined || value === "") {
        return "";
    }

    const val = Number(value);
    if (isNaN(val)) return "";

    switch (key) {
        case "spo2":
            if (val <= settings.spo2_warning_level) return "text-orange font-bold";
            if (val < settings.spo2_min) return "text-warning font-bold";
            return "text-success font-bold";


        case "systolic":
            if (val < settings.systolic_min || val > settings.systolic_max) return "text-warning font-bold";
            return "text-success font-bold";

        case "diastolic":
            if (val < settings.diastolic_min || val > settings.diastolic_max) return "text-warning font-bold";
            return "text-success font-bold";

        case "temperature":
            if (val < settings.temperature_min || val > settings.temperature_max) return "text-warning font-bold";
            return "text-success font-bold";

        case "pulse":
            if (val < settings.pulse_min || val > settings.pulse_max) return "text-warning font-bold";
            return "text-success font-bold";

        default:
            return "";
    }
};
