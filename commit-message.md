🔧 Fix Netlify build - Frontend only deployment

✅ Critical fixes implemented:
- Modified `npm run build` to frontend-only (vite build)
- Created `build:full` script for local development
- Updated netlify.toml to use standard build command
- Separated frontend and backend builds completely

🎯 This resolves Netlify build failures:
- ✘ Could not resolve "./supabase-client"
- ✘ Could not resolve "../services/supabase-storage.service"  
- ✘ Could not resolve "../../supabase-auth-middleware"

🚀 Now Netlify will:
- Use `npm run build` (frontend only)
- Deploy to `dist/public` 
- Skip backend compilation entirely
- Avoid server-side import resolution issues

📦 Build tested locally and working
🔄 Backwards compatible - use `npm run build:full` for complete build 