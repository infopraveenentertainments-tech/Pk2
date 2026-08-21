# Praveen Kitkat Dynamic Magic Show Website

## What this is
A real dynamic website with:
- Public magic-show website
- SQLite database
- Admin login/dashboard
- Editable website settings
- Add/delete services
- Add/delete testimonials
- Upload/delete gallery images
- Booking enquiry form
- Saved enquiries with status tracking
- WhatsApp booking links
- Your uploaded photos already included

## Run locally

1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run:
   npm install
4. Start:
   npm start
5. Open:
   http://localhost:3000

## Admin
Open:
http://localhost:3000/admin/login

Default password:
Magic@1234

IMPORTANT: Before putting the website online, set these environment variables:
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=your-long-random-secret

## Database
The SQLite database is created automatically at:
data/site.db

## Deployment note
This version is designed for a normal Node.js server/container (Render, Railway, VPS, etc.), not a static hosting service. SQLite and uploaded files need persistent storage. For Cloudflare-only deployment, the database/storage should be converted to Cloudflare D1 + R2.
