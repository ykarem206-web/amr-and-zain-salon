// --- إعدادات Firebase وقاعدة البيانات ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyA1A_MxTa6ZRa-Dp3Dt0Fw87w7fASO4PoU",
  authDomain: "amr-and-zain.firebaseapp.com",
  projectId: "amr-and-zain",
  storageBucket: "amr-and-zain.firebasestorage.app",
  messagingSenderId: "967997333804",
  appId: "1:967997333804:web:2b7c731f8c32c794cb8c89"
};

// تشغيل Firebase
const app = initializeApp(firebaseConfig);
// تشغيل قاعدة البيانات (Firestore)
const db = getFirestore(app);
// ----------------------------------------

// 1. تخزين بيانات الحجز (State Management)
// بنستخدم كائن (Object) عشان نحفظ اختيارات العميل خطوة بخطوة
const bookingState = {
    barber: null,
    date: null,
    time: null,
    userName: '',
    userPhone: ''
};

// 2. تحديد الشاشات (DOM Elements)
const sections = {
    welcome: document.getElementById('welcome-section'),
    barbers: document.getElementById('barber-section'),
    datetime: document.getElementById('datetime-section'),
    confirmation: document.getElementById('confirmation-section'),
    success: document.getElementById('success-section')
};

// 3. دالة التنقل بين الشاشات (Navigation Function)
// الدالة دي بتاخد الشاشة اللي عايزين نظهرها، وتخفي الباقي
const showSection = (sectionToShow) => {
    // بنلف على كل الشاشات ونخفيها باستخدام Object.values (ES6 Feature)
    Object.values(sections).forEach(section => {
        section.classList.add('hidden');
    });
    // نظهر الشاشة المطلوبة
    sectionToShow.classList.remove('hidden');
};

// 4. تشغيل أزرار "التالي" و "رجوع" (Event Listeners)

// من الترحيب لاختيار الحلاق
document.getElementById('start-booking-btn').addEventListener('click', () => {
    showSection(sections.barbers);
});

// رجوع من الحلاقين للترحيب
document.getElementById('back-to-welcome').addEventListener('click', () => {
    showSection(sections.welcome);
});

// 5. اختيار الحلاق والانتقال لشاشة المواعيد
// هنحدد كل كروت الحلاقين (أي عنصر واخد كلاس group في شاشة الحلاقين)
const barberCards = document.querySelectorAll('#barber-section .group');

barberCards.forEach(card => {
    card.addEventListener('click', (e) => {
        // هنجيب اسم الحلاق من تاج h3 جوه الكارت
        const barberName = card.querySelector('h3').innerText;
        bookingState.barber = barberName; // نحفظ الاسم في الـ State
        console.log('تم اختيار الحلاق:', bookingState.barber); // للـ Debugging
        
        // ننقله للشاشة اللي بعدها
        showSection(sections.datetime);
    });
});

// رجوع من المواعيد للحلاقين
document.getElementById('back-to-barbers').addEventListener('click', () => {
    showSection(sections.barbers);
});

// من المواعيد لتأكيد الحجز وتحديث الملخص
document.getElementById('continue-to-confirm').addEventListener('click', () => {
    // التأكد إن العميل اختار حلاق ويوم ووقت قبل ما يكمل
    if(!bookingState.barber || !bookingState.date || !bookingState.time) {
        alert('برجاء اختيار الحلاق واليوم والوقت أولاً');
        return; // توقف الدالة هنا وماتكملش
    }

    // تحديث الملخص في الشاشة
    document.getElementById('summary-barber').innerText = bookingState.barber;
    document.getElementById('summary-datetime').innerText = `${bookingState.date}، الساعة ${bookingState.time}`;
    
    showSection(sections.confirmation);
});

// رجوع من تأكيد الحجز للمواعيد
document.getElementById('back-to-datetime').addEventListener('click', () => {
    showSection(sections.datetime);
});

// 6. التعامل مع فورم التأكيد النهائي وإرسال البيانات لـ Firebase و EmailJS
const bookingForm = document.getElementById('booking-form');
const confirmBtn = document.getElementById('confirm-booking-btn');

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    bookingState.userName = document.getElementById('user-name').value;
    bookingState.userPhone = document.getElementById('user-phone').value;

    const originalBtnText = confirmBtn.innerText;
    confirmBtn.innerText = 'جاري تأكيد الحجز وإرسال الإشعار...';
    confirmBtn.disabled = true;
    confirmBtn.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        // 1. إرسال البيانات لقاعدة البيانات (Firestore)
        const docRef = await addDoc(collection(db, "bookings"), {
            barberName: bookingState.barber,
            bookingDate: bookingState.date,
            bookingTime: bookingState.time,
            customerName: bookingState.userName,
            customerPhone: bookingState.userPhone,
            createdAt: new Date()
        });
        
        console.log("تم حفظ الحجز بنجاح في قاعدة البيانات!");

        // 2. تجهيز المتغيرات لإرسال الإيميل (لازم الأسماء تكون مطابقة للي في Template بالظبط)
        const templateParams = {
            customer_name: bookingState.userName,
            customer_phone: bookingState.userPhone,
            barber_name: bookingState.barber,
            booking_date: bookingState.date,
            booking_time: bookingState.time
        };

        // 3. أمر إرسال الإيميل عن طريق EmailJS
        // بنحط الـ Service ID ثم الـ Template ID ثم المتغيرات
        await emailjs.send("service_qvuxqfc", "template_1jixepe", templateParams);
        console.log("تم إرسال إشعار الإيميل بنجاح!");

        // 4. طباعة البيانات في شاشة النجاح
        document.getElementById('final-name').innerText = bookingState.userName;
        document.getElementById('final-phone').innerText = bookingState.userPhone;
        document.getElementById('final-barber').innerText = bookingState.barber;
        document.getElementById('final-datetime').innerText = `${bookingState.date}، الساعة ${bookingState.time}`;

        // 5. عرض شاشة النجاح
        showSection(sections.success);
        
    } catch (error) {
        console.error("حصل خطأ أثناء تأكيد الحجز:", error);
        alert("عذراً، حدث خطأ في الاتصال. يرجى التأكد من الإنترنت والمحاولة مرة أخرى.");
    } finally {
        confirmBtn.innerText = originalBtnText;
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
});
// 7. توليد الأيام تلقائياً (مثلاً لمدة 14 يوم قدام)
const daysContainer = document.getElementById('days-container');
const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const monthsOfYear = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
let daysHTML = '';

// هنعمل لوب يلف 14 مرة عشان يطبع 14 يوم
for (let i = 0; i < 14; i++) {
    let d = new Date();
    d.setDate(d.getDate() + i); // بنزود عدد الأيام على تاريخ النهاردة
    
    let dayName = daysOfWeek[d.getDay()]; // اسم اليوم
    let dayNum = d.getDate(); // رقم اليوم في الشهر
    let monthName = monthsOfYear[d.getMonth()]; // اسم الشهر

    // بنضيف زرار لكل يوم في المتغير بتاعنا
    daysHTML += `
        <button data-date="${dayName} ${dayNum} ${monthName}" class="date-btn flex-shrink-0 w-20 h-24 cursor-pointer bg-white border border-gray-200 text-gray-700 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm hover:border-gray-400 transition-colors">
            <span class="text-xs opacity-75">${dayName}</span>
            <span class="text-xl font-bold">${dayNum}</span>
            <span class="text-xs font-medium opacity-90">${monthName}</span>
        </button>
    `;
}
// بنرمي الزراير كلها جوه الـ HTML
daysContainer.innerHTML = daysHTML;


// 8. توليد الأوقات المتاحة

// === كود رسم زراير الأوقات في الشاشة ===
const timesContainer = document.getElementById('times-container');
const availableTimesList = [
    '01:30 م', '02:00 م', '02:30 م', '03:00 م',
    '03:30 م', '04:00 م', '04:30 م', '05:00 م',
    '05:30 م', '06:00 م', '06:30 م', '07:00 م',
    '07:30 م', '08:00 م', '08:30 م', '09:00 م',
    '09:30 م', '10:00 م', '10:30 م', '11:00 م',
    '11:30 م', '12:00 ص', '12:30 ص', '01:00 ص',
];
let timesHTML = '';
availableTimesList.forEach(time => {
    timesHTML += `<button class="time-btn py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:border-white cursor-pointer transition-colors font-medium text-sm">${time}</button>`;
});
timesContainer.innerHTML = timesHTML;
// ==========================================
// 9. تفعيل الكليك على الأيام والأوقات (مع جلب المواعيد المحجوزة من فايربيز)
const dateButtons = document.querySelectorAll('.date-btn');
const timeButtons = document.querySelectorAll('.time-btn');

// دالة لجلب المواعيد وقفلها
const checkAvailableTimes = async () => {
    // 1. تصفير كل زراير الأوقات لفتحها من جديد
    timeButtons.forEach(timeBtn => {
        timeBtn.disabled = false;
        timeBtn.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed', 'border-gray-100', 'bg-black', 'text-white', 'border-black', 'bg-red-50', 'text-red-400', 'border-red-100');
        timeBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-200', 'hover:border-black');
    });

    // 2. تطبيق منطق إجازة الإثنين
    const selectedDayBtn = Array.from(dateButtons).find(btn => btn.classList.contains('bg-black'));
    if (selectedDayBtn) {
        const dayName = selectedDayBtn.querySelector('span.text-sm').innerText;
        if (dayName === 'الإثنين') {
            timeButtons.forEach(timeBtn => {
                timeBtn.disabled = true;
                timeBtn.classList.remove('bg-white', 'text-gray-700', 'hover:border-black');
                timeBtn.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed', 'border-gray-100');
            });
            bookingState.time = null;
            return; // توقف هنا وماتسألش فايربيز لأن اليوم كله إجازة
        }
    }

    // 3. سؤال فايربيز عن المواعيد المحجوزة
    if (!bookingState.barber || !bookingState.date) return;

    try {
        // تجهيز الفلتر
        const q = query(
            collection(db, "bookings"),
            where("barberName", "==", bookingState.barber),
            where("bookingDate", "==", bookingState.date)
        );

        // جلب البيانات
        const querySnapshot = await getDocs(q);
        const bookedTimes = [];
        
        querySnapshot.forEach((doc) => {
            // لاحظ هنا استخدمنا bookingTime زي ما هي عندك في فايربيز
            if (doc.data().bookingTime) {
                bookedTimes.push(doc.data().bookingTime);
            }
        });

        // 1. التنظيف العميق للمواعيد اللي جاية من فايربيز (مسح أي حروف مخفية)
        const cleanBookedTimes = bookedTimes.map(t => t.replace(/[^\d:صم]/g, ''));

        // 2. قفل المواعيد المحجوزة
        timeButtons.forEach(btn => {
            // تنظيف وقت الزرار عشان المقارنة تنجح 
            const cleanBtnTime = btn.innerText.replace('(محجوز)', '').replace(/[^\d:صم]/g, '');

            if (cleanBookedTimes.includes(cleanBtnTime)) {
                // لو محجوز: اقفل الزرار ولونه أحمر
                btn.disabled = true;
                btn.classList.remove('bg-white', 'text-gray-700', 'hover:border-black', 'bg-black', 'text-white');
                btn.classList.add('bg-red-50', 'text-red-400', 'cursor-not-allowed', 'border-red-100');
                
                // ضيف كلمة محجوز جنب الوقت لو مش موجودة
                if (!btn.innerText.includes('(محجوز)')) {
                    btn.innerText = btn.innerText + ' (محجوز)';
                }
            } else {
                // لو متاح: لازم نرجع كل حاجة لأصلها عشان لو كان مقفول قبل كده يفتح
                btn.disabled = false; // افتح الزرار تاني
                
                // شيل الألوان الحمراء والأسود
                btn.classList.remove('bg-red-50', 'text-red-400', 'cursor-not-allowed', 'border-red-100', 'bg-black', 'text-white');
                
                // رجع الألوان الطبيعية بتاعة الزرار المتاح
                btn.classList.add('bg-white', 'text-gray-700', 'hover:border-black');
                
                // شيل كلمة محجوز
                btn.innerText = btn.innerText.replace('(محجوز)', '').trim();
            }
        });
    } catch (error) {
        console.error("خطأ في جلب المواعيد:", error);
    }
};

// تفعيل اختيار اليوم
dateButtons.forEach(button => {
    // خلينا الـ arrow function هنا async عشان نقدر نستنى الدالة اللي بتكلم فايربيز
    button.addEventListener('click', async () => {
        // تصفير كل زراير الأيام
        dateButtons.forEach(btn => {
            btn.classList.remove('bg-black', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700');
        });
        
        // تفعيل الزرار الحالي لليوم
        button.classList.remove('bg-white', 'text-gray-700');
        button.classList.add('bg-black', 'text-white');
        
        bookingState.date = button.getAttribute('data-date');
        console.log('اليوم المختار:', bookingState.date);
        
        // تفريغ الوقت القديم عشان العميل يضطر يختار وقت جديد لليوم الجديد
        bookingState.time = null; 

        // تشغيل دالة البحث في فايربيز
        await checkAvailableTimes();
    });
});

// تفعيل اختيار الوقت
timeButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (button.disabled) return; 

        timeButtons.forEach(btn => {
            if (!btn.disabled) {
                btn.classList.remove('bg-black', 'text-white', 'border-black');
                btn.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
            }
        });
        
        button.classList.remove('bg-white', 'text-gray-700', 'border-gray-200');
        button.classList.add('bg-black', 'text-white', 'border-white');
        
        bookingState.time = button.innerText.trim();
        console.log('الوقت المختار:', bookingState.time);
    });
});

// 10. العودة للرئيسية وتصفير البيانات
document.getElementById('return-home-btn').addEventListener('click', () => {
    // تصفير الـ State
    bookingState.barber = null;
    bookingState.date = null;
    bookingState.time = null;
    bookingState.userName = '';
    bookingState.userPhone = '';

    // تفريغ الفورم
    document.getElementById('user-name').value = '';
    document.getElementById('user-phone').value = '';

    // الرجوع للشاشة الأولى
    showSection(sections.welcome);
});

// === كود تشغيل نافذة الاستعلام والإلغاء ===
const searchModal = document.getElementById('search-modal');
const openSearchModalBtn = document.getElementById('open-search-modal-btn');
const closeSearchModalBtn = document.getElementById('close-search-modal-btn');
const searchBtn = document.getElementById('search-booking-btn');
const phoneInput = document.getElementById('search-phone');
const resultsContainer = document.getElementById('search-results');

// 1. فتح النافذة
if (openSearchModalBtn) {
    openSearchModalBtn.addEventListener('click', () => {
        searchModal.classList.remove('hidden');
    });
}

// 2. قفل النافذة (من علامة X أو بالضغط برة المربع)
const closeModal = () => {
    searchModal.classList.add('hidden');
    phoneInput.value = ''; // تنظيف الحقل
    resultsContainer.innerHTML = ''; // تنظيف النتائج
};

if (closeSearchModalBtn) {
    closeSearchModalBtn.addEventListener('click', closeModal);
}
if (searchModal) {
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeModal();
    });
}

// 3. البحث في فايربيز
if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        
        if (!phone) {
            alert("برجاء إدخال رقم الموبايل للبحث");
            return;
        }

        resultsContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">جاري البحث...</p>';

        try {
            const q = query(collection(db, "bookings"), where("customerPhone", "==", phone));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                resultsContainer.innerHTML = '<p class="text-sm text-red-500 text-center py-4 bg-red-50 rounded-lg">لا توجد حجوزات مسجلة بهذا الرقم</p>';
                return;
            }

            let html = '';
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const docId = docSnap.id; 
                
                html += `
                    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-row-reverse justify-between items-center">
                        <div class="text-right">
                            <p class="text-sm font-bold text-gray-800">الحلاق: ${data.barberName}</p>
                            <p class="text-xs text-gray-600 mt-1">${data.bookingDate} | ${data.bookingTime}</p>
                        </div>
                        <button onclick="cancelBooking('${docId}')" class="bg-white cursor-pointer text-red-500 border border-red-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition shadow-sm">
                            إلغاء
                        </button>
                    </div>
                `;
            });
            resultsContainer.innerHTML = html;

        } catch (error) {
            console.error("Error searching bookings:", error);
            resultsContainer.innerHTML = '<p class="text-sm text-red-500 text-center">حدث خطأ أثناء البحث. حاول مرة أخرى.</p>';
        }
    });
}

// 4. دالة الإلغاء
window.cancelBooking = async (docId) => {
    if (confirm("هل أنت متأكد من إلغاء هذا الموعد؟")) {
        try {
            const docRef = doc(db, "bookings", docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                await deleteDoc(docRef);

                // إرسال الإيميل عبر EmailJS
                await emailjs.send("service_qvuxqfc", "template_yownb3c", {
                    barber_name: data.barberName,
                    customer_name: data.customerName,
                    booking_date: data.bookingDate,
                    booking_time: data.bookingTime,
                    customer_phone: data.customerPhone
                });

                alert("تم إلغاء الحجز وإبلاغ الصالون بنجاح.");
                location.reload();
            }
        } catch (error) {
            alert("حدث خطأ أثناء الإلغاء");
        }
    }
};