import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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


const checkPhoneInput = document.getElementById('user-phone');

// فلتر الأرقام: بيمنع الحروف والأرقام العربي في نفس اللحظة
if (checkPhoneInput) {
    checkPhoneInput.addEventListener('input', function(e) {
        // بيمسح أي حاجة مش أرقام إنجليزية (0-9)
        let cleanedValue = this.value.replace(/[^0-9]/g, '');
        
        // لو الرقم زاد عن 11 بيقصه
        if (cleanedValue.length > 11) {
            cleanedValue = cleanedValue.substring(0, 11);
        }
        
        // بيرجع القيمة النظيفة للخانة
        this.value = cleanedValue;
    });
}

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

        // 1. تصفير الـ State عشان ننسى أي حاجة العميل اختارها قبل كده
        bookingState.date = null;
        bookingState.time = null;

        // 2. إزالة التحديد من على كل زراير الأيام
        dateButtons.forEach(btn => {
            btn.classList.remove('bg-black', 'text-white', 'border-white');
            btn.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
        });

        // 3. تنظيف كل زراير الأوقات وإرجاعها لحالتها الأصلية المتاحة
        timeButtons.forEach(btn => {
            btn.disabled = false;
            
            // شيل كلاسات الحجز واللون الأحمر والأسود
            btn.classList.remove('bg-red-50', 'text-red-400', 'bg-gray-100', 'text-gray-300', 'cursor-not-allowed', 'opacity-50', 'bg-black', 'text-white', 'border-white', 'border-red-100');
            
            // رجع كلاسات الزرار الطبيعي
            btn.classList.add('bg-white', 'text-gray-700', 'border-gray-200', 'hover:border-black');
            
            // شيل كلمة (محجوز) لو كانت مكتوبة
            btn.innerText = btn.innerText.replace('(محجوز)', '').trim();
        });
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

    // كمين التحقق من رقم الموبايل
    if (document.getElementById('user-phone').value.length !== 11) {
        alert("عذراً، يجب إدخال رقم موبايل صحيح مكون من 11 رقم!");
        return; // الفرملة اللي بتوقف الكود
    }

    //  كمين منع تكرار الحجز
    try {
        const userPhoneValue = document.getElementById('user-phone').value;
        const checkQuery = query(collection(db, "bookings"), where("customerPhone", "==", userPhoneValue));
        const checkSnapshot = await getDocs(checkQuery);

        if (!checkSnapshot.empty) {
            alert("عذراً! هذا الرقم لديه حجز قادم بالفعل. لا يمكنك حجز موعد جديد حتى تنتهي من موعدك الحالي أو تقوم بإلغائه.");
            return; 
        }
    } catch (error) {
        console.error("خطأ في التحقق من الحجوزات السابقة:", error);
    }

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

        // --- بداية كود Web3Forms 
        try {
            const emailResponse = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    access_key: "566c6deb-d5ca-49c6-aee7-beb9b0e23597",
                    subject: `حجز جديد 💈: ${bookingState.userName} عند ${bookingState.barber}`,
                    from_name: "سيستم حجز صالون عمرو وزين",
                    "اسم العميل": bookingState.userName,
                    "رقم الموبايل": bookingState.userPhone,
                    "الحلاق": bookingState.barber,
                    "تاريخ الحجز": bookingState.date,
                    "الساعة": bookingState.time
                }),
            });

            const emailResult = await emailResponse.json();
            if (emailResult.success) {
                console.log("تم إرسال الإشعارات بنجاح عبر Web3Forms");
            } else {
                console.error("مشكلة في إرسال الإيميل:", emailResult);
            }
        } catch (error) {
             console.error("خطأ في الاتصال بـ Web3Forms:", error);
        }
        // --- نهاية كود Web3Forms ---

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
        const dayName = selectedDayBtn.querySelector('span.text-xs').innerText;
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
        const cleanBookedTimes = bookedTimes.map(t => t.replace(/[^\d: صم]/g, '').replace(/\s+/g, ' ').trim());

        // 2. قفل المواعيد المحجوزة
        timeButtons.forEach(btn => {
            // تنظيف وقت الزرار عشان المقارنة تنجح 
            const cleanBtnTime = btn.innerText.replace('(محجوز)', '').replace(/[^\d: صم]/g, '').replace(/\s+/g, ' ').trim();

            console.log(`مقارنة: الزرار [${cleanBtnTime}] | الداتابيز:`, cleanBookedTimes);

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

                // --- بداية كود Web3Forms للإلغاء ---
                try {
                    const cancelEmailResponse = await fetch("https://api.web3forms.com/submit", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            access_key: "566c6deb-d5ca-49c6-aee7-beb9b0e23597",
                            subject: `إلغاء حجز ❌: ${data.customerName} عند ${data.barberName}`,
                            from_name: "سيستم حجز صالون عمرو وزين",
                            "نوع العملية": "إلغاء حجز ❌",
                            "اسم العميل": data.customerName,
                            "رقم الموبايل": data.customerPhone,
                            "الحلاق": data.barberName,
                            "تاريخ الحجز الملغي": data.bookingDate,
                            "الساعة الملغية": data.bookingTime
                        }),
                    });

                    const cancelEmailResult = await cancelEmailResponse.json();
                    if (cancelEmailResult.success) {
                        console.log("تم إرسال إشعار الإلغاء بنجاح عبر Web3Forms");
                    } else {
                        console.error("مشكلة في إرسال إيميل الإلغاء:", cancelEmailResult);
                    }
                } catch (emailError) {
                    console.error("خطأ في الاتصال بـ Web3Forms:", emailError);
                }
                // --- نهاية كود Web3Forms للإلغاء ---

                alert("تم إلغاء الحجز وإبلاغ الصالون بنجاح.");
                location.reload();
            }
        } catch (error) {
            alert("حدث خطأ أثناء الإلغاء");
        }
    }
};

// دالة التنظيف التلقائي للمواعيد القديمة
async function cleanupOldBookings() {
    try {
        // 1. قاموس الشهور عشان الجافا سكريبت تفهم العربي
        const arabicMonths = {
            "يناير": 0, "فبراير": 1, "مارس": 2, "أبريل": 3, "مايو": 4, "يونيو": 5,
            "يوليو": 6, "أغسطس": 7, "سبتمبر": 8, "أكتوبر": 9, "نوفمبر": 10, "ديسمبر": 11
        };

        const q = query(collection(db, "bookings"));
        const querySnapshot = await getDocs(q);
        
        // تاريخ النهارده بالضبط (ونصفر الساعات عشان نقارن بالأيام بس)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        querySnapshot.forEach(async (document) => {
            const data = document.data();
            const bookingDateStr = data.bookingDate; // ده التاريخ المتخزن عندك (مثال: الخميس 7 مايو)
            
            if (bookingDateStr) {
                // بنفصل النص عشان نطلع الرقم والشهر
                const parts = bookingDateStr.split(" "); 
                if (parts.length >= 3) {
                    const day = parseInt(parts[1]); // رقم اليوم (مثال: 7)
                    const monthName = parts[2]; // اسم الشهر (مثال: مايو)
                    const month = arabicMonths[monthName];

                    if (month !== undefined && !isNaN(day)) {
                        const currentYear = new Date().getFullYear();
                        const bookingDate = new Date(currentYear, month, day);
                        
                        // 2. المقارنة الحاسمة: لو تاريخ الحجز أقدم من النهارده، امسحه!
                        if (bookingDate < today) {
                            await deleteDoc(doc(db, "bookings", document.id));
                            console.log(`تم مسح حجز قديم بتاريخ: ${bookingDateStr}`);
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("خطأ في تنظيف الحجوزات القديمة:", error);
    }
}

// تشغيل دالة التنظيف التلقائي عند فتح الموقع
cleanupOldBookings();