
const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Magic@1234";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-session-secret";

const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(dataDir, "site.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id=1),
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  instagram TEXT NOT NULL,
  about TEXT NOT NULL,
  hero_image TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  rating INTEGER DEFAULT 5
);
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  image TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  event_date TEXT,
  event_type TEXT,
  location TEXT,
  guests TEXT,
  message TEXT,
  status TEXT DEFAULT 'New',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const settingsCount = db.prepare("SELECT COUNT(*) AS c FROM settings").get().c;
if (!settingsCount) {
  db.prepare(`INSERT INTO settings (id,name,tagline,city,phone,instagram,about,hero_image)
    VALUES (1,?,?,?,?,?,?,?)`).run(
      "Praveen Kitkat",
      "Magic • Juggling • Corporate • Weddings • Kids Shows",
      "Bangalore",
      "9035528821",
      "https://www.instagram.com/mr_magic_pro",
      "Professional magician and entertainer based in Bangalore, creating interactive experiences for audiences of all ages.",
      "hero.jpg"
  );
}
if (db.prepare("SELECT COUNT(*) AS c FROM services").get().c === 0) {
  const seed = db.prepare("INSERT INTO services (title,description,image,sort_order) VALUES (?,?,?,?)");
  [
    ["Close-Up Magic","Interactive magic that happens right in front of your guests.","close-up-magic.jpg",1],
    ["Stage Magic","Visual illusions, audience participation and theatrical moments.","stage-magic.jpg",2],
    ["Corporate Shows","High-energy entertainment for family days, conferences and celebrations.","corporate-show.jpg",3],
    ["Kids & Family","Fun, colourful and interactive magic for younger audiences.","kids-show.jpg",4],
    ["Juggling","Skillful juggling and visual comedy that keeps the crowd engaged.","juggling.jpg",5],
    ["Weddings & Events","Memorable entertainment for receptions and celebrations.","stage-performance.jpg",6]
  ].forEach(x => seed.run(...x));
}
if (db.prepare("SELECT COUNT(*) AS c FROM testimonials").get().c === 0) {
  const seed = db.prepare("INSERT INTO testimonials (name,text,rating) VALUES (?,?,?)");
  [
    ["Happy Client","Amazing performance! Our guests were talking about the magic all evening.",5],
    ["Corporate Event","Professional, energetic and fantastic with the audience.",5],
    ["Birthday Celebration","The kids absolutely loved the show. Highly recommended!",5]
  ].forEach(x => seed.run(...x));
}
if (db.prepare("SELECT COUNT(*) AS c FROM gallery").get().c === 0) {
  const seed = db.prepare("INSERT INTO gallery (title,image,sort_order) VALUES (?,?,?)");
  [
    ["Live Magic","hero.jpg",1],["Stage Magic","stage-magic.jpg",2],["Kids Show","kids-show.jpg",3],
    ["Close-Up Magic","close-up-magic.jpg",4],["Juggling","juggling.jpg",5],["Live Event","stage-performance.jpg",6]
  ].forEach(x => seed.run(...x));
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000*60*60*8 }
}));

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    cb(null, `${Date.now()}-${safe}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP and GIF images are allowed."));
  }
});

function waLink(message) {
  return "https://wa.me/91" + db.prepare("SELECT phone FROM settings WHERE id=1").get().phone.replace(/\D/g,"") + "?text=" + encodeURIComponent(message);
}
function auth(req,res,next){ if(req.session.admin) return next(); res.redirect("/admin/login"); }

app.get("/", (req,res) => {
  const settings = db.prepare("SELECT * FROM settings WHERE id=1").get();
  const services = db.prepare("SELECT * FROM services ORDER BY sort_order,id").all();
  const testimonials = db.prepare("SELECT * FROM testimonials ORDER BY id DESC").all();
  const gallery = db.prepare("SELECT * FROM gallery ORDER BY sort_order,id").all();
  res.render("home",{settings,services,testimonials,gallery,waLink});
});

app.post("/enquiry", (req,res) => {
  const {name,phone,event_date,event_type,location,guests,message} = req.body;
  if(!name || !phone) return res.status(400).send("Name and phone are required.");
  db.prepare(`INSERT INTO enquiries (name,phone,event_date,event_type,location,guests,message)
    VALUES (?,?,?,?,?,?,?)`).run(name,phone,event_date||"",event_type||"",location||"",guests||"",message||"");
  const text = `Hi Praveen, I sent an enquiry on your website.\nName: ${name}\nPhone: ${phone}\nEvent: ${event_type||"-"}\nDate: ${event_date||"-"}\nLocation: ${location||"-"}\nGuests: ${guests||"-"}\nMessage: ${message||"-"}`;
  res.redirect(waLink(text));
});

app.get("/admin/login",(req,res)=>res.render("login",{error:null}));
app.post("/admin/login",(req,res)=>{
  if(req.body.password === ADMIN_PASSWORD){ req.session.admin=true; return res.redirect("/admin"); }
  res.render("login",{error:"Incorrect password."});
});
app.post("/admin/logout",(req,res)=>req.session.destroy(()=>res.redirect("/admin/login")));

app.get("/admin",auth,(req,res)=>{
  const settings=db.prepare("SELECT * FROM settings WHERE id=1").get();
  const services=db.prepare("SELECT * FROM services ORDER BY sort_order,id").all();
  const testimonials=db.prepare("SELECT * FROM testimonials ORDER BY id DESC").all();
  const gallery=db.prepare("SELECT * FROM gallery ORDER BY sort_order,id").all();
  const enquiries=db.prepare("SELECT * FROM enquiries ORDER BY id DESC").all();
  res.render("admin",{settings,services,testimonials,gallery,enquiries});
});

app.post("/admin/settings",auth,upload.single("hero"),(req,res)=>{
  let hero=req.body.hero_image || db.prepare("SELECT hero_image FROM settings WHERE id=1").get().hero_image;
  if(req.file) hero=req.file.filename;
  db.prepare(`UPDATE settings SET name=?,tagline=?,city=?,phone=?,instagram=?,about=?,hero_image=? WHERE id=1`)
    .run(req.body.name,req.body.tagline,req.body.city,req.body.phone,req.body.instagram,req.body.about,hero);
  res.redirect("/admin?ok=settings");
});

app.post("/admin/services/add",auth,upload.single("image"),(req,res)=>{
  db.prepare("INSERT INTO services (title,description,image,sort_order) VALUES (?,?,?,?)")
    .run(req.body.title,req.body.description,req.file ? req.file.filename : "stage-magic.jpg",Number(req.body.sort_order)||0);
  res.redirect("/admin?ok=service");
});
app.post("/admin/services/:id/delete",auth,(req,res)=>{
  db.prepare("DELETE FROM services WHERE id=?").run(req.params.id); res.redirect("/admin?ok=deleted");
});

app.post("/admin/testimonials/add",auth,(req,res)=>{
  db.prepare("INSERT INTO testimonials (name,text,rating) VALUES (?,?,?)")
    .run(req.body.name,req.body.text,Math.min(5,Math.max(1,Number(req.body.rating)||5)));
  res.redirect("/admin?ok=testimonial");
});
app.post("/admin/testimonials/:id/delete",auth,(req,res)=>{
  db.prepare("DELETE FROM testimonials WHERE id=?").run(req.params.id); res.redirect("/admin?ok=deleted");
});

app.post("/admin/gallery/add",auth,upload.single("image"),(req,res)=>{
  if(!req.file) return res.redirect("/admin?error=image");
  db.prepare("INSERT INTO gallery (title,image,sort_order) VALUES (?,?,?)")
    .run(req.body.title || "Magic Show",req.file.filename,Number(req.body.sort_order)||0);
  res.redirect("/admin?ok=gallery");
});
app.post("/admin/gallery/:id/delete",auth,(req,res)=>{
  db.prepare("DELETE FROM gallery WHERE id=?").run(req.params.id); res.redirect("/admin?ok=deleted");
});

app.post("/admin/enquiries/:id/status",auth,(req,res)=>{
  db.prepare("UPDATE enquiries SET status=? WHERE id=?").run(req.body.status,req.params.id);
  res.redirect("/admin#enquiries");
});

app.use((err,req,res,next)=>{ console.error(err); res.status(400).send(err.message || "Something went wrong."); });
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Praveen Kitkat website running on port ${PORT}`);});
