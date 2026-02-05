# Task Tracker - Troubleshooting Guide

## 🆘 Common Issues & Solutions

---

## 1. **App Won't Start**

### Error: `npm run dev` shows error
**Solutions:**
```bash
# Clear node_modules
rm -r node_modules
npm install

# If still error, try:
npm cache clean --force
npm install

# Check Node version (need 14+)
node --version
```

---

## 2. **Firebase Connection Issues**

### Issue: "Firebase initialization failed"
**Causes & Fixes:**
- Firebase credentials mungkin salah
- Internet connection problem
- Firebase project disabled

**Fix:**
```javascript
// Verify di src/firebase/firebase.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // harus ada
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID",
};
```

---

## 3. **Login/Signup Issues**

### Issue: "Invalid email format"
**Fix:**
- Email must be valid format: `user@example.com`
- Check for typos
- No spaces allowed

### Issue: "Password too short"
**Fix:**
- Password must be minimum 6 characters
- Include numbers, symbols untuk better security
- Example: `MyPassword123`

### Issue: "User already exists"
**Fix:**
- Email already registered
- Use different email untuk signup
- Or use "Already have account? Login"

### Issue: Login works but redirect to signup page
**Cause:** Role mungkin tidak ada di Firestore
**Fix:**
1. Check Firestore → users collection
2. Verify user document has `role` field
3. If missing, manually add `role: "admin"` or `role: "staff"`

---

## 4. **Photo Upload Issues**

### Issue: "Cannot upload photo"
**Possible causes:**
- File format not supported (gunakan PNG/JPG)
- File size > 5MB
- Storage not enabled di Firebase
- No upload permission

**Solutions:**
```
// Supported formats:
✅ .jpg / .jpeg
✅ .png
✅ .gif
❌ .pdf, .doc, .txt

// File size limit: 5MB
// Compress image: https://tinypng.com
```

### Issue: "Storage quota exceeded"
**Fix:**
- Delete unused photos
- Compress before upload
- Upgrade Firebase plan

### Issue: "Photo uploaded but not showing"
**Fix:**
1. Refresh browser
2. Check Firestore task document → `proofPhotos` array
3. Verify URL structure
4. Clear browser cache

---

## 5. **Task Management Issues**

### Issue: "Admin can create task tapi staff cannot see"
**Causes:**
- Task not assigned ke correct staff UID
- Staff UID di Firestore different dari actual

**Fix:**
1. Copy exact UID dari staff's user document
2. When creating task, ensure "assignedTo" matches
3. Verify di Firestore: tasks → assignedTo value

### Issue: "Cannot edit task"
**Fix:**
- Only admin boleh edit
- Ensure anda logged in as admin
- Try refresh page

### Issue: "Task deleted tapi still showing"
**Fix:**
1. Hard refresh: Ctrl+Shift+Delete
2. Close browser completely, reopen
3. Check Firestore → task really deleted

---

## 6. **Email Reminder Issues**

### Issue: "Send Reminder shows 'Cloud Function not deployed'"
**Status:** Normal jika belum setup Cloud Function
**To Fix:**
1. Follow instructions di `SETUP_GUIDE.md`
2. Deploy Cloud Function ke Firebase
3. Set environment variables
4. Try again

### Issue: "Email sent but staff didn't receive"
**Troubleshoot:**
```
1. Check spam folder
2. Verify staff email di Firestore correct
3. Check Cloud Function logs:
   Firebase Console → Cloud Functions → Logs
4. Ask admin to resend reminder
```

### Issue: "Cloud Function returning error"
**Check:**
1. Function deployed successfully
2. Environment variables set correctly
3. Email service credentials valid
4. Function timeout (default 60s)

---

## 7. **Role-Based Access Issues**

### Issue: "Staff dapat access admin dashboard"
**This shouldn't happen**, but if it does:
1. Check user document di Firestore
2. Verify `role` field value exactly: `"staff"` atau `"admin"`
3. Logout dan login again
4. Clear browser localStorage

**Check code:**
```javascript
// App.jsx should have this logic
route="/admin-dashboard" 
element={user && userRole === "admin" ? <AdminDashboard /> : <Navigate to="/" />}
```

### Issue: "Always redirect ke login page"
**Causes:**
- Role not found di Firestore
- User document missing
- Firebase Auth issue

**Fix:**
1. Go to Firebase Console
2. Check users collection
3. Verify all users have `role` field
4. If missing, add manually

---

## 8. **UI/Display Issues**

### Issue: "Page looks broken on mobile"
**Fix:**
- Try landscape orientation
- Try different browser
- Check if CSS file loaded properly
- Open DevTools → check for CSS errors

### Issue: "Buttons not working"
**Possible causes:**
- JavaScript error (check DevTools console)
- Event handler issue
- Browser compatibility

**Fix:**
- Try different browser
- Clear cache
- Check browser console (F12)

### Issue: "Styles not applying"
**Fix:**
```bash
# Hard refresh
Ctrl+Shift+R (Windows)
Cmd+Shift+R (Mac)

# If still issue:
npm run dev
# Kill terminal
# Restart: npm run dev
```

---

## 9. **Performance Issues**

### Issue: "App is slow/laggy"
**Causes:**
- Too many tasks loaded
- Photo uploads slow
- Internet connection

**Fix:**
1. Check internet speed
2. Compress photos sebelum upload
3. Use filter untuk reduce tasks shown
4. Try incognito mode

### Issue: "Database queries slow"
**Note:** First query mungkin slower (cold start)
**After that:** Should be fast

---

## 10. **Browser-Specific Issues**

### Safari issues:
```
- FileInput styling might look different
- Solution: Use different browser atau update Safari
```

### Firefox issues:
```
- Some animations might be choppy
- Solution: Update Firefox browser
```

### Internet Explorer:
```
NOT SUPPORTED - Use Chrome, Firefox, Safari, atau Edge
```

---

## 📝 Debug Checklist

Before contacting support, try:
- [ ] Refresh page (F5)
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Clear browser cache
- [ ] Try incognito mode
- [ ] Try different browser
- [ ] Logout dan login again
- [ ] Check internet connection
- [ ] Check console errors (F12)
- [ ] Check Firestore data

---

## 🔍 How to Check Browser Console

1. Press `F12` pada keyboard
2. Click "Console" tab
3. Look untuk red errors
4. Copy error message
5. Search error online atau provide to support

---

## 📊 Check Firestore Data

1. Go to Firebase Console
2. Select project
3. Go to Firestore Database
4. Check collections:
   - `users` - Should have all users with `role`
   - `tasks` - Should have all tasks with correct `assignedTo`

---

## 🔧 Reset Application

Jika semua tak jalan, reset:

```bash
# Option 1: Clear data
1. Open DevTools (F12)
2. Go to Application tab
3. Clear All Site Data
4. Refresh page
5. Sign up baru

# Option 2: Full reinstall
rm -r node_modules
npm install
npm run dev
```

---

## ✉️ When to Ask for Help

Provide these info:
1. **What you were doing** (exact steps)
2. **What happened** (actual behavior)
3. **What should happen** (expected behavior)
4. **Error message** (if any, from console)
5. **Browser** (Chrome, Firefox, etc.)
6. **OS** (Windows, Mac, Linux)

---

## 🆘 Getting Support

1. **Check this guide** first
2. **Check console errors** (F12)
3. **Check Firestore data** consistency
4. **Try different browser**
5. **Contact admin/IT** dengan details

---

## 💡 Pro Tips

**To avoid issues:**
- Always use latest browser version
- Don't clear browser data often
- Keep password secure
- Don't share login credentials
- Report bugs immediately
- Use high-quality images untuk upload

---

## 📋 Issue Report Template

Jika need help, provide:

```
**Issue:** [Brief description]

**Steps to reproduce:**
1. ...
2. ...
3. ...

**Expected behavior:**
[What should happen]

**Actual behavior:**
[What actually happened]

**Error message:**
[If any]

**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 10]
- Version: [App version]

**Screenshots:**
[If applicable]
```

---

**Last Updated:** January 29, 2026
**Support Status:** Community Support Available
