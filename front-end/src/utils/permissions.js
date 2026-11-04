// Mirrors IsSystemsAdminUser on the backend, which is what actually enforces it.
export const isAdmin = (auth) => auth?.role === "sysadmin";
