import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ----------------------------------------

// State Management: Store booking progression
const bookingState = {
    barber: null,
    date: null,
    time: null,
    userName: '',
    userPhone: ''
};

// DOM Elements
const sections = {
    welcome: document.getElementById('welcome-section'),
    barbers: document.getElementById('barber-section'),
    datetime: document.getElementById('datetime-section'),
    confirmation: document.getElementById('confirmation-section'),
    success: document.getElementById('success-section')
};

const checkPhoneInput = document.getElementById('user-phone');

// Input validation: Restrict phone number to 11 English digits
if (checkPhoneInput) {
    checkPhoneInput.addEventListener('input', function(e) {
        let cleanedValue = this.value.replace(/[^0-9]/g, '');
        
        if (cleanedValue.length > 11) {
            cleanedValue = cleanedValue.substring(0, 11);
        }
        
        this.value = cleanedValue;
    });
}

// Navigation Function: Handle UI section transitions
const showSection = (sectionToShow) => {
    Object.values(sections).forEach(section => {
        section.classList.add('hidden');
    });
    sectionToShow.classList.remove('hidden');
};

// Navigation Event Listeners

document.getElementById('start-booking-btn').addEventListener('click', () => {
    showSection(sections.barbers);
});

document.getElementById('back-to-welcome').addEventListener('click', () => {
    showSection(sections.welcome);
});

// Barber Selection Handler
const barberCards = document.querySelectorAll('#barber-section .group');

barberCards.forEach(card => {
    card.addEventListener('click', (e) => {
        const barberName = card.querySelector('h3').innerText;
        bookingState.barber = barberName; 
        console.log('تم اختيار الحلاق:', bookingState.barber); 
        
        showSection(sections.datetime);

        // Reset date/time state for new barber selection
        bookingState.date = null;
        bookingState.time = null;

        // Reset UI for date buttons
        dateButtons.forEach(btn => {
            btn.classList.remove('bg-black', 'text-white', 'border-white');
            btn.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
        });

        // Reset UI for time buttons
        timeButtons.forEach(btn => {
            btn.disabled = false;
            
            btn.classList.remove('bg-red-50', 'text-red-400', 'bg-gray-100', 'text-gray-300', 'cursor-not-allowed', 'opacity-50', 'bg-black', 'text-white', 'border-white', 'border-red-100');
            
            btn.classList.add('bg-white', 'text-gray-700', 'border-gray-200', 'hover:border-black');
            
            btn.innerText = btn.innerText.replace('(محجوز)', '').trim();
        });
    });
});

document.getElementById('back-to-barbers').addEventListener('click', () => {
    showSection(sections.barbers);
});

// Validate booking state before proceeding to confirmation
document.getElementById('continue-to-confirm').addEventListener('click', () => {
    if(!bookingState.barber || !bookingState.date || !bookingState.time) {
        alert('برجاء اختيار الحلاق واليوم والوقت أولاً');
        return; 
    }

    // Update confirmation UI
    document.getElementById('summary-barber').innerText = bookingState.barber;
    document.getElementById('summary-datetime').innerText = `${bookingState.date}، الساعة ${bookingState.time}`;
    
    showSection(sections.confirmation);
});

document.getElementById('back-to-datetime').addEventListener('click', () => {
    showSection(sections.datetime);
});

// Form Submission: Handle booking creation and notifications
const bookingForm = document.getElementById('booking-form');
const confirmBtn = document.getElementById('confirm-booking-btn');

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // Rate limiting: Prevent multiple bookings from the same device in a single day
    const lastBookingDate = localStorage.getItem("salon_booked_date");
    const today = new Date().toDateString();

    if (lastBookingDate === today) {
        alert("لقد قمت بتسجيل حجز بالفعل من هذا الجهاز اليوم! برجاء المحاولة في يوم آخر.");
        return;
    }

    // Validate phone number length
    if (document.getElementById('user-phone').value.length !== 11) {
        alert("عذراً، يجب إدخال رقم موبايل صحيح مكون من 11 رقم!");
        return;
    }

    // Prevent duplicate active bookings for the same phone number
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
        // Save booking to Firestore
        const docRef = await addDoc(collection(db, "bookings"), {
            barberName: bookingState.barber,
            bookingDate: bookingState.date,
            bookingTime: bookingState.time,
            customerName: bookingState.userName,
            customerPhone: bookingState.userPhone,
            createdAt: new Date()
        });
        
        console.log("تم حفظ الحجز بنجاح في قاعدة البيانات!");

        // Store local fingerprint for rate limiting
        localStorage.setItem("salon_booked_date", new Date().toDateString());

        // Send email notification via Web3Forms API
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

        // Populate success screen data
        document.getElementById('final-name').innerText = bookingState.userName;
        document.getElementById('final-phone').innerText = bookingState.userPhone;
        document.getElementById('final-barber').innerText = bookingState.barber;
        document.getElementById('final-datetime').innerText = `${bookingState.date}، الساعة ${bookingState.time}`;

        // Display success section
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

// Dynamic Calendar: Generate next 14 days
const daysContainer = document.getElementById('days-container');
const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const monthsOfYear = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
let daysHTML = '';

for (let i = 0; i < 14; i++) {
    let d = new Date();
    d.setDate(d.getDate() + i); 
    
    let dayName = daysOfWeek[d.getDay()]; 
    let dayNum = d.getDate(); 
    let monthName = monthsOfYear[d.getMonth()]; 

    daysHTML += `
        <button data-date="${dayName} ${dayNum} ${monthName}" class="date-btn flex-shrink-0 w-20 h-24 cursor-pointer bg-white border border-gray-200 text-gray-700 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm hover:border-gray-400 transition-colors">
            <span class="text-xs opacity-75">${dayName}</span>
            <span class="text-xl font-bold">${dayNum}</span>
            <span class="text-xs font-medium opacity-90">${monthName}</span>
        </button>
    `;
}

// Render generated days
daysContainer.innerHTML = daysHTML;

// Render static time slots
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

// Time Slot Validation: Fetch and process availability
const dateButtons = document.querySelectorAll('.date-btn');
const timeButtons = document.querySelectorAll('.time-btn');

const checkAvailableTimes = async () => {
    // Reset all time buttons to default active state
    timeButtons.forEach(timeBtn => {
        timeBtn.disabled = false;
        timeBtn.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed', 'border-gray-100', 'bg-black', 'text-white', 'border-black', 'bg-red-50', 'text-red-400', 'border-red-100');
        timeBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-200', 'hover:border-black');
    });

    // Business Logic: Block Mondays entirely
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
            return; 
        }
    }

    // Check dynamic day-offs configured via admin dashboard
    if (bookingState.date) {
        try {
            const closedSnapshot = await getDocs(collection(db, "closedDates"));
            let isDayClosed = false;

            // Localization dictionaries
            const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

            closedSnapshot.forEach((docSnap) => {
                const dbDate = docSnap.data().date; 
                
                // Normalize timezone
                const [year, month, day] = dbDate.split('-');
                const d = new Date(year, month - 1, day);
                
                const formattedDbDate = `${arabicDays[d.getDay()]} ${parseInt(day)} ${arabicMonths[d.getMonth()]}`;
                
                // Verify if selected date matches a closed day
                if (formattedDbDate === bookingState.date) {
                    const blockedBarber = docSnap.data().barber || "الكل";
                    
                    if (blockedBarber === "الكل" || blockedBarber === bookingState.barber) {
                        isDayClosed = true;
                    }
                }
            });

            // Disable UI if the target barber or salon is off
            if (isDayClosed) {
                timeButtons.forEach(timeBtn => {
                    timeBtn.disabled = true;
                    timeBtn.classList.remove('bg-white', 'text-gray-700', 'hover:border-black');
                    timeBtn.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed', 'border-gray-100');
                });
                bookingState.time = null;
                
                alert("عفواً، هذا الحلاق غير متاح اليوم لظروف خاصة. برجاء اختيار يوم آخر أو حلاق آخر.");
                return; 
            }
        } catch (error) {
            console.error("خطأ في التحقق من الأيام المغلقة:", error);
        }
    }

    // Fetch specific booked slots for the selected date and barber
    if (!bookingState.barber || !bookingState.date) return;

    try {
        const q = query(
            collection(db, "bookings"),
            where("barberName", "==", bookingState.barber),
            where("bookingDate", "==", bookingState.date)
        );

        const querySnapshot = await getDocs(q);
        const bookedTimes = [];
        
        querySnapshot.forEach((doc) => {
            if (doc.data().bookingTime) {
                bookedTimes.push(doc.data().bookingTime);
            }
        });

        // Normalize fetched data to prevent mismatch due to hidden characters
        const cleanBookedTimes = bookedTimes.map(t => t.replace(/[^\d: صم]/g, '').replace(/\s+/g, ' ').trim());

        // Update time slots UI based on availability
        timeButtons.forEach(btn => {
            const cleanBtnTime = btn.innerText.replace('(محجوز)', '').replace(/[^\d: صم]/g, '').replace(/\s+/g, ' ').trim();

            if (cleanBookedTimes.includes(cleanBtnTime)) {
                // Mark as booked
                btn.disabled = true;
                btn.classList.remove('bg-white', 'text-gray-700', 'hover:border-black', 'bg-black', 'text-white');
                btn.classList.add('bg-red-50', 'text-red-400', 'cursor-not-allowed', 'border-red-100');
                
                if (!btn.innerText.includes('(محجوز)')) {
                    btn.innerText = btn.innerText + ' (محجوز)';
                }
            } else {
                // Mark as available
                btn.disabled = false; 
                
                btn.classList.remove('bg-red-50', 'text-red-400', 'cursor-not-allowed', 'border-red-100', 'bg-black', 'text-white');
                
                btn.classList.add('bg-white', 'text-gray-700', 'hover:border-black');
                
                btn.innerText = btn.innerText.replace('(محجوز)', '').trim();
            }
        });
    } catch (error) {
        console.error("خطأ في جلب المواعيد:", error);
    }
};

// Date Selection Handler
dateButtons.forEach(button => {
    button.addEventListener('click', async () => {
        dateButtons.forEach(btn => {
            btn.classList.remove('bg-black', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700');
        });
        
        button.classList.remove('bg-white', 'text-gray-700');
        button.classList.add('bg-black', 'text-white');
        
        bookingState.date = button.getAttribute('data-date');
        console.log('اليوم المختار:', bookingState.date);
        
        // Reset time selection upon changing dates
        bookingState.time = null; 

        // Validate availability for the newly selected date
        await checkAvailableTimes();
    });
});

// Time Selection Handler
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

// Reset Application State
document.getElementById('return-home-btn').addEventListener('click', () => {
    bookingState.barber = null;
    bookingState.date = null;
    bookingState.time = null;
    bookingState.userName = '';
    bookingState.userPhone = '';

    document.getElementById('user-name').value = '';
    document.getElementById('user-phone').value = '';

    showSection(sections.welcome);
});

// Booking Lookup and Cancellation Modal
const searchModal = document.getElementById('search-modal');
const openSearchModalBtn = document.getElementById('open-search-modal-btn');
const closeSearchModalBtn = document.getElementById('close-search-modal-btn');
const searchBtn = document.getElementById('search-booking-btn');
const phoneInput = document.getElementById('search-phone');
const resultsContainer = document.getElementById('search-results');

if (openSearchModalBtn) {
    openSearchModalBtn.addEventListener('click', () => {
        searchModal.classList.remove('hidden');
    });
}

const closeModal = () => {
    searchModal.classList.add('hidden');
    phoneInput.value = ''; 
    resultsContainer.innerHTML = ''; 
};

if (closeSearchModalBtn) {
    closeSearchModalBtn.addEventListener('click', closeModal);
}
if (searchModal) {
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeModal();
    });
}

// Search bookings by phone number
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

// Cancel Booking Handler
window.cancelBooking = async (docId) => {
    if (confirm("هل أنت متأكد من إلغاء هذا الموعد؟")) {
        try {
            const docRef = doc(db, "bookings", docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                await deleteDoc(docRef);

                // Send cancellation email notification
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

                alert("تم إلغاء الحجز وإبلاغ الصالون بنجاح.");
                location.reload();
            }
        } catch (error) {
            alert("حدث خطأ أثناء الإلغاء");
        }
    }
};

// Database Maintenance: Clean up past bookings
async function cleanupOldBookings() {
    try {
        const arabicMonths = {
            "يناير": 0, "فبراير": 1, "مارس": 2, "أبريل": 3, "مايو": 4, "يونيو": 5,
            "يوليو": 6, "أغسطس": 7, "سبتمبر": 8, "أكتوبر": 9, "نوفمبر": 10, "ديسمبر": 11
        };

        const q = query(collection(db, "bookings"));
        const querySnapshot = await getDocs(q);
        
        // Set reference date to start of today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        querySnapshot.forEach(async (document) => {
            const data = document.data();
            const bookingDateStr = data.bookingDate; 
            
            if (bookingDateStr) {
                const parts = bookingDateStr.split(" "); 
                if (parts.length >= 3) {
                    const day = parseInt(parts[1]); 
                    const monthName = parts[2]; 
                    const month = arabicMonths[monthName];

                    if (month !== undefined && !isNaN(day)) {
                        const currentYear = new Date().getFullYear();
                        const bookingDate = new Date(currentYear, month, day);
                        
                        // Delete document if booking date has passed
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

// Trigger maintenance on application load
cleanupOldBookings();