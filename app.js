// --- إعدادات Firebase وقاعدة البيانات ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
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
let daysHTML = '';

// هنعمل لوب يلف 14 مرة عشان يطبع 14 يوم
for (let i = 0; i < 14; i++) {
    let d = new Date();
    d.setDate(d.getDate() + i); // بنزود عدد الأيام على تاريخ النهاردة
    
    let dayName = daysOfWeek[d.getDay()]; // اسم اليوم
    let dayNum = d.getDate(); // رقم اليوم في الشهر

    // بنضيف زرار لكل يوم في المتغير بتاعنا
    daysHTML += `
        <button class="date-btn shrink-0 w-16 h-20 bg-white border border-gray-200 text-gray-700 rounded-xl flex flex-col items-center justify-center hover:border-black transition-colors">
            <span class="text-sm">${dayName}</span>
            <span class="text-xl font-bold">${dayNum}</span>
        </button>
    `;
}
// بنرمي الزراير كلها جوه الـ HTML
daysContainer.innerHTML = daysHTML;


// 8. توليد الأوقات المتاحة
const timesContainer = document.getElementById('times-container');
// تقدر تزود أو تنقص الأوقات دي براحتك جداً
const availableTimes = [
    '12:00 م', '01:00 م', '02:00 م', '03:00 م', 
    '04:00 م', '05:00 م', '06:00 م', '07:00 م', 
    '08:00 م', '09:00 م', '10:00 م', '11:00 م'
];
let timesHTML = '';

availableTimes.forEach(time => {
    timesHTML += `
        <button class="time-btn py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:border-black transition-colors font-medium text-sm">
            ${time}
        </button>
    `;
});
timesContainer.innerHTML = timesHTML;


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
        // تجهيز الفلتر (الاستعلام)
        const q = query(
            collection(db, "bookings"), 
            where("barberName", "==", bookingState.barber),
            where("bookingDate", "==", bookingState.date)
        );

        // جلب البيانات
        const querySnapshot = await getDocs(q);
        const bookedTimes = []; 
        
        querySnapshot.forEach((doc) => {
            bookedTimes.push(doc.data().bookingTime);
        });

        console.log("المواعيد المحجوزة لهذا اليوم:", bookedTimes);

        // 4. قفل المواعيد اللي رجعت من فايربيز
        timeButtons.forEach(btn => {
            // بنستخدم trim عشان نتأكد إن مفيش مسافات زيادة تلخبط المقارنة
            if (bookedTimes.includes(btn.innerText.trim())) {
                btn.disabled = true;
                btn.classList.remove('bg-white', 'text-gray-700', 'hover:border-black');
                // لون أحمر باهت للمواعيد المحجوزة
                btn.classList.add('bg-red-50', 'text-red-400', 'cursor-not-allowed', 'border-red-100');
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
        
        bookingState.date = button.innerText.replace('\n', ' ');
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
        button.classList.add('bg-black', 'text-white', 'border-black');
        
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