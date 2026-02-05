# Task Tracker - Quick Setup

## ✅ Apa sudah siap:

### 1. **User Authentication** ✓
- Sign up dengan role selection (Admin/Staff)
- Email & Password authentication via Firebase
- User data auto-save ke Firestore

### 2. **Role-Based Access** ✓
- Automatic routing berdasarkan user role
- Admin → `/admin-dashboard`
- Staff → `/dashboard`

### 3. **Admin Features** ✓
- Create, Edit, Delete tasks
- Assign tasks to staff
- View all tasks & status
- Send email reminders (setup required)

### 4. **Staff Features** ✓
- View assigned tasks only
- Mark tasks as complete/pending
- Upload proof photos
- View uploaded photos

### 5. **Photo Upload** ✓
- Firebase Storage integration
- Multiple photos per task
- Automatic gallery display

---

## 🔧 Installation Steps

### 1. **Install Dependencies**
```bash
cd task-tracker
npm install
```

### 2. **Start Development Server**
```bash
npm run dev
```

Server akan start di `http://localhost:5173`

### 3. **Build for Production**
```bash
npm run build
```

---

## 🔑 Firebase Configuration

Your Firebase config is already setup di:
```
src/firebase/firebase.js
```

No changes needed unless anda guna different Firebase project.

---

## 📧 Email Reminder Setup (Optional)

Untuk enable email reminders, anda perlu:

### Step 1: Enable Cloud Functions
1. Go to Firebase Console
2. Navigate ke Cloud Functions
3. Create new function dengan nama: `sendReminder`
4. Runtime: Node.js 18
5. Paste code dari `SETUP_GUIDE.md`

### Step 2: Set Environment Variables
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Step 3: Deploy
```bash
firebase deploy --only functions
```

**Note:** Tanpa setup ini, "Send Reminder" button akan show error.

---

## 🚀 First Time Setup Checklist

- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Test sign up dengan admin role
- [ ] Test sign up dengan staff role
- [ ] Create sample task sebagai admin
- [ ] View task sebagai staff
- [ ] Upload proof photo
- [ ] Test logout dan login
- [ ] (Optional) Setup email reminders

---

## 📁 Key Files Modified/Created

### New Files:
- `src/pages/AdminDashboard.jsx` - Admin dashboard
- `src/pages/Dashboard.jsx` - Staff dashboard (updated)
- `src/utils/emailReminder.js` - Email utility
- `SETUP_GUIDE.md` - Detailed setup guide
- `USER_GUIDE.md` - User manual

### Modified Files:
- `src/App.jsx` - Role-based routing
- `src/pages/Signup.jsx` - Role selection added
- `src/firebase/firebase.js` - Storage added
- `src/styles/dashboard.css` - New styles added
- `src/styles/login.css` - Select styling added

---

## 🎨 Design Highlights

- **Color Scheme**: Purple gradient (#667eea → #764ba2)
- **Effects**: Glassmorphism + Framer Motion animations
- **Responsive**: Mobile-friendly design
- **Emojis**: User-friendly icons throughout

---

## 🧪 Testing Guide

### Test Admin Flow:
1. Sign up as Admin
2. Create 2-3 test tasks
3. Verify tasks appear in list
4. Try edit and delete
5. (Optional) Send reminder

### Test Staff Flow:
1. Sign up as Staff (use different email)
2. Task won't appear (need admin to assign)
3. Admin assign task to this staff email
4. Staff login, task should appear
5. Upload proof photo
6. Mark as complete

### Test Photo Upload:
1. Use staff account
2. Assign task with due date
3. Open task in staff dashboard
4. Select small image file
5. Click "Upload Photo"
6. Verify photo appears in gallery

---

## ⚠️ Important Notes

1. **Email Reminders**: Optional setup. Works without it.
2. **Storage**: First 1GB free, after that charges apply.
3. **Firestore**: 50,000 free reads/writes daily.
4. **Security Rules**: Configure in Firebase Console before production.

---

## 🔐 Basic Firestore Security Rules

Setup di Firebase Console → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Tasks - read own, write if admin
    match /tasks/{taskId} {
      allow read: if request.auth.uid == resource.data.assignedTo || 
                     request.auth.uid == resource.data.createdBy;
      allow write: if request.auth.uid == resource.data.createdBy;
    }
  }
}
```

---

## 📊 Database Quotas (Free Tier)

- **Firestore Reads**: 50,000/day
- **Firestore Writes**: 20,000/day
- **Storage**: 5GB
- **Functions**: 125,000 invocations/month

---

## 🆘 Troubleshooting

### Port 5173 already in use?
```bash
npm run dev -- --port 3000
```

### Firebase config not working?
- Check API keys di firebase.js
- Verify Firestore database is enabled
- Check Firebase project is active

### Photos not uploading?
- Verify Storage bucket exists
- Check user has upload permission
- Verify file size < 5MB

---

## 📞 Quick Support

| Issue | Solution |
|-------|----------|
| App won't start | Run `npm install` again |
| Login not working | Check Firebase credentials |
| Photos won't upload | Verify Storage rules |
| Email not sending | Setup Cloud Function |
| Role routing wrong | Clear browser cache, refresh |

---

## ✨ Next Steps

After setup:
1. Create admin account for testing
2. Create staff accounts
3. Try all features
4. Setup email (optional)
5. Deploy to production

---

**Setup Complete! 🎉**

Untuk detailed instructions: `SETUP_GUIDE.md`
Untuk user instructions: `USER_GUIDE.md`
