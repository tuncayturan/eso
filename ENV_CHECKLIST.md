# Environment Variables Checklist

## ✅ Gerekli Environment Variables

### 1. Firebase Client Configuration (Client-side)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Firebase Admin SDK (Server-side)
```env
FIREBASE_PROJECT_ID=your_project_id
GOOGLE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key\n-----END PRIVATE KEY-----\n"
```

### 3. Push Notifications
```env
NEXT_PUBLIC_VAPID_KEY=your_vapid_key
```

### 4. Site URL
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

## 📝 Vercel Deployment Notları

1. **Vercel Dashboard'da Environment Variables ekleyin:**
   - Settings → Environment Variables
   - Tüm yukarıdaki değişkenleri ekleyin
   - Production, Preview, Development için ayrı ayrı ekleyebilirsiniz

2. **GOOGLE_PRIVATE_KEY için önemli:**
   - Private key'i tırnak içinde ekleyin
   - `\n` karakterlerini koruyun
   - Vercel'de multi-line value olarak ekleyin

3. **NEXT_PUBLIC_SITE_URL:**
   - Production için: `https://your-app.vercel.app`
   - Vercel otomatik olarak `NEXT_PUBLIC_VERCEL_URL` sağlar ama manuel de ekleyebilirsiniz

## ⚠️ Dikkat Edilmesi Gerekenler

- ✅ `.env.local` dosyasını **ASLA** GitHub'a commit etmeyin
- ✅ `.env.example` dosyasını oluşturun (örnek değerlerle)
- ✅ Vercel'de tüm environment variable'ları ekleyin
- ✅ `NEXT_PUBLIC_` prefix'i olanlar client-side'da kullanılabilir
- ✅ `NEXT_PUBLIC_` prefix'i olmayanlar sadece server-side'da kullanılır

## 🔍 Kontrol Listesi

- [ ] Tüm Firebase config değişkenleri var mı?
- [ ] Firebase Admin SDK değişkenleri var mı?
- [ ] VAPID_KEY var mı?
- [ ] NEXT_PUBLIC_SITE_URL doğru mu?
- [ ] GOOGLE_PRIVATE_KEY formatı doğru mu? (tırnak içinde, \n karakterleri ile)
- [ ] .env.local .gitignore'da mı?

