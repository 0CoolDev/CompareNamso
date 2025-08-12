// Add this import at the top of routes.ts
import authRoutes from "./routes/auth";

// Then in the registerRoutes function, after the app setup, add:
// app.use("/api/auth", authRoutes);
