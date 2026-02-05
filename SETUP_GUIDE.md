# Task Tracker - Multi-Role Application

Sistem task tracker untuk company dengan 2 role berbeza:

## 🎯 Features

### 1. **Two User Roles**
- **Admin/Manager** - Boleh create, edit, delete, dan assign tasks
- **Staff** - Boleh view assigned tasks dan upload proof photos

### 2. **Admin Dashboard** (`/admin-dashboard`)
- ✅ Create new tasks dengan title, description, due date, priority
- ✅ Assign tasks kepada staff
- ✅ Edit existing tasks
- ✅ Delete tasks
- ✅ View semua tasks dan status
- ✅ Send email reminders kepada staff untuk pending tasks
- 📧 Integration dengan Firebase Cloud Functions untuk email

### 3. **Staff Dashboard** (`/dashboard`)
- 👁️ View assigned tasks sahaja
- ✅ Mark tasks as completed
- 🔄 Reopen completed tasks
- 📸 Upload proof photos untuk setiap task
- 🖼️ View semua uploaded proof photos

### 4. **Photo Upload & Proof**
- Upload gambar sebagai bukti task completion
- Photos tersimpan di Firebase Storage
- Admin dapat view semua proof photos dari tasks
- Multiple photos per task boleh upload

### 5. **Firebase Integration**
- 🔐 Email & Password Authentication
- 📚 Firestore Database untuk data management
- 💾 Firebase Storage untuk photo uploads

---

## 🚀 Getting Started

### 1. **Sign Up Process**
```
1. User navigate ke / (signup page)
2. Pilih role: Admin atau Staff
3. Masukkan nama, email, password
4. User akan auto-redirect ke login page
5. Data disimpan di Firestore collection "users"
```

### 2. **Login & Navigation**
```
- Admin login → navigate ke /admin-dashboard
- Staff login → navigate ke /dashboard
- Logout → redirect ke signup page
```

---

## 📊 Database Structure

### Users Collection
```javascript
{
  uid: "firebase-uid",
  name: "John Doe",
  email: "john@example.com",
  role: "admin" || "staff",
  createdAt: timestamp
}
```

### Tasks Collection
```javascript
{
  title: "Task Name",
  description: "Task Description",
  assignedTo: "staff-uid",
  createdBy: "admin-uid",
  status: "pending" || "completed",
  priority: "low" || "medium" || "high",
  dueDate: "2026-02-15",
  proofPhotos: [
    {
      url: "firebase-storage-url",
      uploadedAt: timestamp,
      uploadedBy: "staff-uid"
    }
  ],
  lastReminderSent: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 📧 Email Reminder Setup

Untuk enable email reminders, anda perlu set up Firebase Cloud Function:

### 1. **Install Firebase CLI**
```bash
npm install -g firebase-tools
firebase login
```

### 2. **Create Cloud Function**

Di Firebase Console, create new Cloud Function dengan code:

```javascript
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Configure email service (gunakan Gmail atau SendGrid)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendReminder = functions.https.onRequest((req, res) => {
  const { email, name, taskTitle } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Task Reminder: ${taskTitle}`,
    html: `
      <h2>Hi ${name},</h2>
      <p>You have a pending task: <strong>${taskTitle}</strong></p>
      <p>Please complete it as soon as possible.</p>
      <a href="https://your-app-url.com/dashboard">View Task</a>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      res.status(500).send({ error: err });
    } else {
      res.status(200).send({ success: true });
    }
  });
});
```

3. **Set Environment Variables** di Firebase Console

---

## 🎨 Styling

- **Color Scheme**: Purple gradient (#667eea to #764ba2)
- **Components**: Glassmorphism design dengan Framer Motion animations
- **Responsive**: Mobile-friendly pada semua devices

---

## 🔒 Security Notes

- Firebase Auth handles password security
- Firestore Rules restrict user access ke own data
- Storage Rules restrict file access

---

## 📱 File Structure

```
src/
├── pages/
│   ├── Signup.jsx          (Sign up dengan role selection)
│   ├── Login.jsx           (Login page)
│   ├── Dashboard.jsx       (Staff dashboard)
│   └── AdminDashboard.jsx  (Admin dashboard)
├── firebase/
│   └── firebase.js         (Firebase config)
├── utils/
│   └── emailReminder.js    (Email reminder utility)
├── styles/
│   ├── login.css
│   └── dashboard.css
└── App.jsx                 (Role-based routing)
```

---

## 🐛 Troubleshooting

### Email reminders not working?
- Check Cloud Function deployment status
- Verify environment variables
- Check user email addresses di Firestore

### Photos not uploading?
- Verify Firebase Storage rules allow user uploads
- Check file size limits (default: 5MB)
- Ensure valid image format

### Login redirect issues?
- Clear browser cache
- Check user role di Firestore
- Verify routing di App.jsx

---

## ✨ Future Enhancements

- [ ] Task categories/tags
- [ ] Recurring tasks
- [ ] Task comments/notes
- [ ] Performance analytics
- [ ] Mobile app version
- [ ] Two-factor authentication
- [ ] Task templates

---

## 📝 Notes

- Replace Firebase credentials dengan yours
- Set up Cloud Function untuk email reminders
- Configure Firestore Security Rules
- Test thoroughly sebelum production

**Created for: Your Company Name**
**Last Updated: 2026-01-29**
