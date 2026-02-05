# Task Tracker - User Guide (Panduan Pengguna)

## 🎯 Admin/Manager Guide

### Creating Tasks
1. Login dengan role "Admin/Manager"
2. Masuk ke Admin Dashboard
3. Click "+ Create New Task"
4. Isi form:
   - **Task Title** - Nama task
   - **Description** - Huraian terperinci
   - **Assign To** - Pilih staff yang akan handle
   - **Due Date** - Tarikh akhir (optional)
   - **Priority** - Low, Medium, atau High
5. Click "Create Task"
6. Task akan muncul dalam task list

### Managing Tasks
- **Edit Task** - Click ✏️ button untuk ubah details
- **Delete Task** - Click 🗑️ button untuk delete
- **Send Reminder** - Click 📧 button untuk kirim email reminder ke staff
- **View Status** - Lihat status (PENDING/COMPLETED) di badge

### Viewing Proof Photos
- Setiap task card menunjukkan "Uploaded Proofs" section
- Photos akan display automatically selepas staff upload
- Click photo untuk view full size

---

## 👤 Staff Guide

### Viewing Assigned Tasks
1. Login dengan role "Staff"
2. Masuk ke Your Tasks Dashboard
3. Filter tasks:
   - **All Tasks** - Semua tasks
   - **Pending** - Tasks belum selesai
   - **Completed** - Tasks sudah selesai

### Completing Tasks
1. Click "✅ Mark as Complete" button
2. Task status akan berubah ke COMPLETED
3. Task akan pindah ke "Completed" filter

### Uploading Proof Photo
1. Scroll ke "📸 Upload Proof Photo" section
2. Click "Choose File" atau drag-drop image
3. Click "Upload Photo" button
4. Wait untuk upload complete
5. Photo akan display dalam gallery

### Reopening Tasks
1. Jika task completed tetapi mau ubah:
2. Click "🔄 Reopen Task" button
3. Task status balik ke PENDING

---

## 📊 Task Priority Levels

| Priority | Color  | Meaning |
|----------|--------|---------|
| High     | 🔴 Red | Urgent, complete ASAP |
| Medium   | 🟡 Yellow | Normal, complete on schedule |
| Low      | 🟢 Green | Can wait, lower urgency |

---

## ⏰ Task Status Flow

```
New Task (PENDING)
       ↓
    Staff Works
       ↓
  Upload Proof (Optional)
       ↓
Mark as COMPLETED
       ↓
Admin Reviews
```

---

## 📧 Email Reminders

**Admin dapat send reminder untuk:**
- Tasks yang sudah overdue
- Important tasks yang pending
- Follow-up notifications

**Staff akan terima:**
- Email notification dengan task details
- Link ke dashboard
- Due date information

---

## 🆘 Quick Tips

✅ **Do's:**
- Upload clear, quality proof photos
- Complete tasks before due date
- Check dashboard regularly untuk updates
- Update task status secara accurate

❌ **Don'ts:**
- Upload irrelevant or blurry photos
- Ignore pending tasks
- Modify other people's tasks
- Multiple accounts per person

---

## 🔐 Account Security

1. **Password** - Minimal 6 characters
2. **Email** - Valid company email
3. **Role** - Cannot change after signup
4. **Logout** - Always logout before leaving

---

## 📱 Browser Compatibility

Supported browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Recommended:** Chrome latest version

---

## ❓ FAQ

**Q: Boleh ubah role selepas sign up?**
A: Tidak, role fixed. Contact admin untuk ubah.

**Q: Boleh assign task kepada multiple staff?**
A: Tidak, satu task = satu staff. Create duplicate tasks jika perlu.

**Q: Boleh delete task selepas di-assign?**
A: Ya, admin boleh delete anytime. Staff akan tidak nampak task lagi.

**Q: Berapa saiz maksimum photo upload?**
A: 5MB per photo. Kompres image jika lebih besar.

**Q: Berapa banyak photo boleh upload per task?**
A: Unlimited, upload sebanyak yang diperlukan.

**Q: Boleh view tasks dari colleague?**
A: Tidak, staff hanya nampak own assigned tasks.

**Q: Email reminder automatic atau manual?**
A: Manual - Admin perlu click "Send Reminder" button.

---

## 🚨 Common Issues

### Issue: Can't upload photo
**Solution:**
- Check file format (PNG, JPG, JPEG supported)
- Check file size (max 5MB)
- Refresh page dan try again

### Issue: Task not appearing
**Solution:**
- Refresh dashboard
- Check you're in correct view (All/Pending/Completed)
- Verify task is assigned to you (for staff)

### Issue: Email reminder not received
**Solution:**
- Check spam folder
- Verify email address di Firestore
- Ask admin to resend
- Check email configuration

### Issue: Can't login
**Solution:**
- Verify email dan password correct
- Check CAPS LOCK
- Try password reset
- Clear browser cache

---

## 📞 Support

Untuk masalah teknikal:
1. Check guide ini terlebih dahulu
2. Try refresh/clear cache
3. Contact admin/IT support
4. Provide error message jika ada

---

**Last Updated: 2026-01-29**
**Version: 1.0**
